import { drizzle as drizzleSqlite } from "drizzle-orm/node-sqlite";
import { chmodSync, closeSync, mkdirSync, openSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, posix, resolve, win32 } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { AppDatabase } from "@/core/db";
import { measureSqlSync, type ServerTimings } from "@/core/server-timing";

/** Returns sqlite directory. */
export function defaultSqliteDirectory(
    storageDirectoryName: string,
    system: {
        platform?: NodeJS.Platform;
        environment?: NodeJS.ProcessEnv;
        home?: string;
    } = {},
): string {
    const platform = system.platform ?? process.platform;
    const environment = system.environment ?? process.env;
    const home = system.home ?? homedir();
    if (platform === "win32") {
        const localAppData = environment.LOCALAPPDATA?.trim();
        return win32.join(
            localAppData || win32.join(home, "AppData", "Local"),
            storageDirectoryName,
            "sqlite",
        );
    }

    return posix.join(home, ".local", "share", storageDirectoryName, "sqlite");
}

/** Resolves sqlite path. */
export function resolveSqlitePath(
    storageDirectoryName: string,
    sqliteFilename: string,
    path = process.env.SQLITE_PATH,
): string {
    return resolve(
        path?.trim() ||
            join(defaultSqliteDirectory(storageDirectoryName), sqliteFilename),
    );
}

/** Describes batchable query. */
type BatchableQuery = {
    run?: () => unknown;
    all?: () => unknown;
    get?: () => unknown;
    execute?: () => unknown;
};

/** Runs batch query. */
function runBatchQuery(query: BatchableQuery): unknown {
    if (typeof query.run === "function") {
        return query.run();
    }
    if (typeof query.all === "function") {
        return query.all();
    }
    if (typeof query.get === "function") {
        return query.get();
    }
    if (typeof query.execute === "function") {
        return query.execute();
    }
    throw new Error("Unsupported batch query");
}

/** Prepares sqlite storage. */
function prepareSqliteStorage(path: string): void {
    const directory = dirname(path);
    if (process.platform === "win32") {
        // LOCALAPPDATA inherits the current user's Windows ACLs.
        mkdirSync(directory, { recursive: true });
        return;
    }

    mkdirSync(directory, { recursive: true, mode: 0o700 });
    chmodSync(directory, 0o700);
    const descriptor = openSync(path, "a", 0o600);
    closeSync(descriptor);
    chmodSync(path, 0o600);
}

/**
 * Build a Drizzle client against node:sqlite, with a D1-compatible `batch`.
 */
export function createSqliteDatabase(path: string): {
    db: AppDatabase;
    sqlite: DatabaseSync;
    path: string;
} {
    const absolutePath = resolve(path);
    prepareSqliteStorage(absolutePath);
    const sqlite = new DatabaseSync(absolutePath);
    sqlite.exec("PRAGMA journal_mode = WAL");
    sqlite.exec("PRAGMA foreign_keys = ON");

    // Shared SQLite dialect; cast to the app's D1-shaped client type.
    const db = createSqliteDrizzleDatabase(sqlite);

    return {
        db,
        sqlite,
        path: absolutePath,
    };
}

/** Creates sqlite drizzle database. */
export function createSqliteDrizzleDatabase(
    sqlite: DatabaseSync,
    timings?: ServerTimings,
): AppDatabase {
    const client = timings ? timedSqliteClient(sqlite, timings) : sqlite;
    const drizzleDb = drizzleSqlite({ client });
    Object.assign(drizzleDb, {
        batch: async function batch(queries: BatchableQuery[]) {
            sqlite.exec("BEGIN");
            try {
                const results = queries.map((query) => runBatchQuery(query));
                sqlite.exec("COMMIT");
                return results;
            } catch (error) {
                sqlite.exec("ROLLBACK");
                throw error;
            }
        },
    });
    return drizzleDb as unknown as AppDatabase;
}

/** Wraps a SQLite client to record query timings. */
function timedSqliteClient(
    sqlite: DatabaseSync,
    timings: ServerTimings,
): DatabaseSync {
    return new Proxy(sqlite, {
        get(target, property) {
            if (property === "prepare") {
                return function prepare(sql: string) {
                    const statement = target.prepare(sql);
                    return new Proxy(statement, {
                        get(statementTarget, statementProperty) {
                            if (
                                statementProperty === "run" ||
                                statementProperty === "all" ||
                                statementProperty === "get"
                            ) {
                                return function execute(...params: unknown[]) {
                                    return measureSqlSync(timings, () =>
                                        Reflect.apply(
                                            statementTarget[statementProperty],
                                            statementTarget,
                                            params,
                                        ),
                                    );
                                };
                            }
                            const value = Reflect.get(
                                statementTarget,
                                statementProperty,
                                statementTarget,
                            );
                            return typeof value === "function"
                                ? value.bind(statementTarget)
                                : value;
                        },
                    });
                };
            }
            const value = Reflect.get(target, property, target);
            return typeof value === "function" ? value.bind(target) : value;
        },
    });
}
