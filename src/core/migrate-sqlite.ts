import { drizzle } from "drizzle-orm/node-sqlite";
import { migrate } from "drizzle-orm/node-sqlite/migrator";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { getAsset, getAssetKeys, isSea } from "node:sea";
import type { DatabaseSync } from "node:sqlite";

function extractSeaMigrations(directory: string): void {
    for (const key of getAssetKeys()) {
        const match = /^drizzle\/([^/]+)\/migration\.sql$/.exec(key);
        if (!match?.[1]) {
            continue;
        }

        const migrationDirectory = join(directory, match[1]);
        mkdirSync(migrationDirectory);
        writeFileSync(
            join(migrationDirectory, "migration.sql"),
            getAsset(key, "utf8"),
        );
    }
}

function getAppliedMigrationNames(sqlite: DatabaseSync): Set<string> {
    const table = sqlite
        .prepare(
            "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = '__drizzle_migrations'",
        )
        .get();
    if (!table) {
        return new Set();
    }

    const rows = sqlite
        .prepare("SELECT name FROM __drizzle_migrations WHERE name IS NOT NULL")
        .all();
    return new Set(
        rows.flatMap((row) => (typeof row.name === "string" ? [row.name] : [])),
    );
}

function runMigrations(sqlite: DatabaseSync, migrationsFolder: string): void {
    const db = drizzle({ client: sqlite });
    const appliedNames = getAppliedMigrationNames(sqlite);
    const pending = readMigrationFiles({ migrationsFolder }).filter(
        (migration) => !appliedNames.has(migration.name),
    );

    if (pending.length === 0) {
        console.log("Database migrations are up to date");
    } else {
        const label = pending.length === 1 ? "migration" : "migrations";
        console.log(`Running ${String(pending.length)} database ${label}:`);
        for (const migration of pending) {
            console.log(`  - ${migration.name}`);
        }
    }

    migrate(db, { migrationsFolder });
    if (pending.length > 0) {
        console.log("Database migrations completed");
    }
}

export function migrateSqlite(
    sqlite: DatabaseSync,
    migrationsFolder = resolve("drizzle"),
): void {
    if (isSea()) {
        const directory = mkdtempSync(join(tmpdir(), "loki-migrations-"));
        try {
            extractSeaMigrations(directory);
            runMigrations(sqlite, directory);
        } finally {
            rmSync(directory, { recursive: true, force: true });
        }
        return;
    }

    runMigrations(sqlite, migrationsFolder);
}
