import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { $ } from "zx";
import { orderTableNamesByFk, rewriteDumpForImport } from "./sql-dump.ts";
import { wranglerBin } from "./wrangler-bin.ts";

const DB_BINDING = "DB";

type WranglerEnvelope<T> = {
    results: T[];
    success: boolean;
};

async function wranglerQuery<T = unknown>(
    command: string,
): Promise<WranglerEnvelope<T>[]> {
    const { stdout } = await $`${process.execPath} ${[
        wranglerBin(),
        "d1",
        "execute",
        DB_BINDING,
        "--remote",
        "--json",
        "--command",
        command,
    ]}`;
    const parsed: WranglerEnvelope<T>[] = JSON.parse(stdout);
    if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error("Wrangler returned no result envelope");
    }
    return parsed;
}

async function wranglerApplyFile(filePath: string): Promise<void> {
    await $`${process.execPath} ${[
        wranglerBin(),
        "d1",
        "execute",
        DB_BINDING,
        "--remote",
        "--yes",
        "--file",
        filePath,
    ]}`;
}

async function listTableSchemas(): Promise<
    Array<{ name: string; sql: string | null }>
> {
    const envelopes = await wranglerQuery<{ name: string; sql: string | null }>(
        "SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '\\_cf\\_%' ESCAPE '\\' ORDER BY name",
    );
    return envelopes[0]!.results;
}

async function dropAllTables(): Promise<void> {
    const tables = await listTableSchemas();
    if (tables.length === 0) {
        console.log("Remote database has no tables to drop.");
        return;
    }

    // D1 enforces FKs always. Dropping a parent while a child still references
    // it fails with "no such table" / FK errors even with
    // `PRAGMA defer_foreign_keys = on` if statements run in the wrong order
    // across the graph. Reverse the parent-first sort so children go first.
    const parentFirst = orderTableNamesByFk(
        tables.map((table) => ({
            name: table.name,
            statement: table.sql ?? `CREATE TABLE ${table.name} ()`,
        })),
    );
    const dropOrder = [...parentFirst].reverse();

    console.log(`Dropping ${dropOrder.length} table(s)...`);
    for (const name of dropOrder) {
        console.log(`  ${name}`);
    }

    const drops = dropOrder
        .map((name) => `DROP TABLE IF EXISTS "${name.replaceAll('"', '""')}"`)
        .join("; ");
    await wranglerQuery(`PRAGMA defer_foreign_keys = on; ${drops}`);

    const remaining = await listTableSchemas();
    if (remaining.length > 0) {
        throw new Error(
            `Failed to drop all tables; still present: ${remaining
                .map((t) => t.name)
                .join(", ")}`,
        );
    }
    console.log("Dropped existing tables.");
}

async function main(): Promise<void> {
    const filePath = process.argv[2];
    if (!filePath) {
        console.error("Usage: node scripts/import-remote.ts <backup.sql>");
        process.exit(1);
    }

    await access(filePath);

    console.log(`Importing ${filePath} into remote D1...`);
    // Wipe first: dumps use plain CREATE TABLE, so an existing schema fails
    // with "table already exists".
    await dropAllTables();

    // Reorder CREATE/INSERT for D1 FK rules (see rewriteDumpForImport).
    const raw = await readFile(filePath, "utf8");
    const rewritten = rewriteDumpForImport(raw);
    const dir = await mkdtemp(join(tmpdir(), "loki-d1-import-"));
    const importPath = join(dir, "import.sql");
    try {
        await writeFile(importPath, rewritten, "utf8");
        await wranglerApplyFile(importPath);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }

    console.log("Import complete.");
}

main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
});
