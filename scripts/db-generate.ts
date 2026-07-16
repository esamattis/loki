/**
 * Wrapper around `drizzle-kit generate` that rejects unsafe SQLite rebuilds.
 *
 * drizzle-kit rewrites tables via DROP + recreate when a column default changes.
 * With foreign keys, `DROP TABLE users` cascade-deletes jumps and other user data.
 * This script fails generation if a new migration would drop a table that other
 * tables reference with ON DELETE CASCADE.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { $ } from "zx";

const root = fileURLToPath(new URL("..", import.meta.url));
const migrationsDir = join(root, "drizzle");
const $$ = $({ cwd: root, stdio: "inherit" });

function listSqlFiles(): string[] {
    return readdirSync(migrationsDir)
        .filter((name) => name.endsWith(".sql"))
        .sort();
}

function extractDroppedTables(sql: string): string[] {
    const dropped: string[] = [];
    const re = /DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?[`"]?(\w+)[`"]?/gi;
    for (const match of sql.matchAll(re)) {
        const name = match[1];
        if (name && !name.startsWith("__new_")) {
            dropped.push(name);
        }
    }
    return dropped;
}

function extractCascadeParents(sql: string): Set<string> {
    const parents = new Set<string>();
    const re =
        /REFERENCES\s+[`"]?(\w+)[`"]?\s*\([^)]*\)\s*ON\s+DELETE\s+CASCADE/gi;
    for (const match of sql.matchAll(re)) {
        const name = match[1];
        if (name) {
            parents.add(name);
        }
    }
    return parents;
}

function loadAllCascadeParents(): Set<string> {
    const parents = new Set<string>();
    for (const file of listSqlFiles()) {
        const sql = readFileSync(join(migrationsDir, file), "utf8");
        for (const parent of extractCascadeParents(sql)) {
            parents.add(parent);
        }
    }
    return parents;
}

async function main(): Promise<void> {
    const before = new Set(listSqlFiles());
    await $$`pnpm exec drizzle-kit generate`;
    const after = listSqlFiles();
    const created = after.filter((name) => !before.has(name));
    if (created.length === 0) {
        return;
    }

    const cascadeParents = loadAllCascadeParents();
    const problems: string[] = [];
    for (const file of created) {
        const sql = readFileSync(join(migrationsDir, file), "utf8");
        for (const table of extractDroppedTables(sql)) {
            if (cascadeParents.has(table)) {
                problems.push(
                    `${file}: DROP TABLE \`${table}\` would cascade-delete dependent rows`,
                );
            }
        }
    }

    if (problems.length === 0) {
        return;
    }

    console.error("\nUnsafe migration generated:");
    for (const problem of problems) {
        console.error(`  - ${problem}`);
    }
    console.error(
        "\nSQLite cannot ALTER some column defaults; drizzle-kit rebuilds the table instead.",
    );
    console.error(
        "Do not ship that. Prefer application-level defaults, or hand-write a safe migration.",
    );
    console.error(
        "Delete the new migration file(s) and snapshot under drizzle/meta/ before retrying.\n",
    );
    process.exit(1);
}

main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
});
