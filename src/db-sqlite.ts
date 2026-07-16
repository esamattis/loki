import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import type { AppDatabase } from "@/db";

export function resolveSqlitePath(path = process.env.SQLITE_PATH): string {
    return resolve(
        path?.trim() || join(homedir(), ".local/share/loki/sqlite/loki.sqlite"),
    );
}

type BatchableQuery = {
    run?: () => unknown;
    all?: () => unknown;
    get?: () => unknown;
    execute?: () => unknown;
};

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

/**
 * Build a Drizzle client against better-sqlite3, with a D1-compatible `batch`.
 */
export function createSqliteDatabase(
    path = resolveSqlitePath(),
    nativeBinding?: object,
): {
    db: AppDatabase;
    sqlite: Database.Database;
    path: string;
} {
    const absolutePath = resolve(path);
    mkdirSync(dirname(absolutePath), { recursive: true });
    const sqlite = new Database(
        absolutePath,
        nativeBinding
            ? ({ nativeBinding } as unknown as Database.Options)
            : undefined,
    );
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");

    // Shared SQLite dialect; cast to the app's D1-shaped client type.
    const drizzleDb = drizzleSqlite(sqlite);
    Object.assign(drizzleDb, {
        batch: async function batch(queries: BatchableQuery[]) {
            const run = sqlite.transaction(() => {
                return queries.map((query) => runBatchQuery(query));
            });
            return run();
        },
    });
    const db = drizzleDb as unknown as AppDatabase;

    return {
        db,
        sqlite,
        path: absolutePath,
    };
}
