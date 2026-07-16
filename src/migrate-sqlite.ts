import { readMigrationFiles, type MigrationMeta } from "drizzle-orm/migrator";
import type Database from "better-sqlite3";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { getAsset, isSea } from "node:sea";

type MigrationJournal = {
    entries: {
        breakpoints: boolean;
        tag: string;
        when: number;
    }[];
};

function readSeaMigrationFiles(): MigrationMeta[] {
    const journal = JSON.parse(
        getAsset("drizzle/meta/_journal.json", "utf8"),
    ) as MigrationJournal;

    return journal.entries.map((entry) => {
        const query = getAsset(`drizzle/${entry.tag}.sql`, "utf8");
        return {
            sql: query.split("--> statement-breakpoint"),
            bps: entry.breakpoints,
            folderMillis: entry.when,
            hash: createHash("sha256").update(query).digest("hex"),
        };
    });
}

/**
 * Apply Drizzle migrations to better-sqlite3.
 * Splits multi-statement migration chunks (some historical files omit
 * statement-breakpoint separators that D1 tolerates but better-sqlite3 rejects).
 */
export function migrateSqlite(
    sqlite: Database.Database,
    migrationsFolder = resolve("drizzle"),
): void {
    const migrations = isSea()
        ? readSeaMigrationFiles()
        : readMigrationFiles({ migrationsFolder });

    sqlite.exec(`
        CREATE TABLE IF NOT EXISTS \`__drizzle_migrations\` (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            hash text NOT NULL,
            created_at numeric
        );
    `);

    const appliedRows = sqlite
        .prepare(`SELECT hash FROM \`__drizzle_migrations\``)
        .all() as { hash: string }[];
    const applied = new Set(appliedRows.map((row) => row.hash));

    const insertMigration = sqlite.prepare(
        `INSERT INTO \`__drizzle_migrations\` (\`hash\`, \`created_at\`) VALUES (?, ?)`,
    );

    for (const migration of migrations) {
        if (applied.has(migration.hash)) {
            continue;
        }

        const run = sqlite.transaction(() => {
            for (const query of migration.sql) {
                for (const statement of splitSqlStatements(query)) {
                    sqlite.exec(statement);
                }
            }
            insertMigration.run(migration.hash, migration.folderMillis);
        });
        run();
    }
}

function splitSqlStatements(sql: string): string[] {
    return sql
        .split(";")
        .map((part) => part.trim())
        .filter((part) => part.length > 0);
}
