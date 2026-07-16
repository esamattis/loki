// We shell out to `wrangler d1 execute --remote` instead of using the drizzle
// migrator (`drizzle-orm/d1/migrator`) via `getPlatformProxy({ remoteBindings: true }`) like the
// previous implementation. Despite the option name, `remoteBindings` only routes a binding to the
// remote D1 when the binding is declared with `"remote": true` in wrangler.jsonc (see
// `pickRemoteBindings` in wrangler's source). Our config omits this flag, so the proxy silently
// falls back to the local miniflare SQLite under `.wrangler/state/v3/d1`, the migrator finds the
// migrations already applied there, and the script reports success without ever touching prod.
// Driving `wrangler d1 execute --remote` directly guarantees we hit the production database.
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { $ } from "zx";
import { wranglerBin } from "./wrangler-bin.ts";

const DB_BINDING = "DB";
// Reuse drizzle's default tracking table name and schema so this stays compatible with the drizzle
// migrator (`drizzle-orm/d1/migrator.cjs`) and the journal in `drizzle/meta/_journal.json`.
const MIGRATIONS_TABLE = "__drizzle_migrations";
const MIGRATIONS_FOLDER = "drizzle";

type MigrationJournal = {
    entries: Array<{ tag: string; when: number; breakpoints: boolean }>;
};

type WranglerEnvelope<T> = {
    results: T[];
    success: boolean;
};

async function wranglerQuery<T = unknown>(
    command: string,
): Promise<WranglerEnvelope<T>> {
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
    // `--command` returns pure JSON on stdout: an array of result envelopes (one per statement).
    const parsed: WranglerEnvelope<T>[] = JSON.parse(stdout);
    const [envelope] = parsed;
    if (!envelope) {
        throw new Error("Wrangler returned no result envelope");
    }
    return envelope;
}

async function wranglerApplyFile(filePath: string): Promise<void> {
    // Use `--file` (no `--json`) because the file upload path mixes progress spinner text into
    // stdout, making the output non-parseable. We rely on the non-zero exit code on failure
    // instead of parsing the result envelope.
    await $`${process.execPath} ${[
        wranglerBin(),
        "d1",
        "execute",
        DB_BINDING,
        "--remote",
        "--file",
        filePath,
    ]}`;
}

const MIGRATIONS_TABLE_DDL = `CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (id INTEGER PRIMARY KEY AUTOINCREMENT, hash text NOT NULL, created_at numeric)`;

async function ensureMigrationsTable(): Promise<void> {
    await wranglerQuery(MIGRATIONS_TABLE_DDL);
}

async function getAppliedHashes(): Promise<Set<string>> {
    const result = await wranglerQuery<{ hash: string }>(
        `SELECT hash FROM ${MIGRATIONS_TABLE}`,
    );
    return new Set(result.results.map((row) => row.hash));
}

// Replicate drizzle's migration hash exactly: sha256 of the raw `.sql` file content (see
// `readMigrationFiles` in `drizzle-orm/migrator.cjs`). This is the key used to decide whether a
// migration has already been applied, so any deviation here would cause migrations to re-run.
function computeHash(content: string): string {
    return createHash("sha256").update(content).digest("hex");
}

async function recordMigration(hash: string, when: number): Promise<void> {
    await wranglerQuery(
        `INSERT INTO ${MIGRATIONS_TABLE} (hash, created_at) VALUES ('${hash}', ${when})`,
    );
}

async function applyMigration(
    tag: string,
    hash: string,
    when: number,
): Promise<void> {
    console.log(`Applying migration ${tag}...`);
    await wranglerApplyFile(`${MIGRATIONS_FOLDER}/${tag}.sql`);
    await recordMigration(hash, when);
    console.log(`  Applied ${tag}`);
}

async function main(): Promise<void> {
    const journal: MigrationJournal = JSON.parse(
        await readFile(`${MIGRATIONS_FOLDER}/meta/_journal.json`, "utf8"),
    );

    await ensureMigrationsTable();
    const applied = await getAppliedHashes();

    const pending = journal.entries.filter((entry) => {
        const content = readFileSync(
            `${MIGRATIONS_FOLDER}/${entry.tag}.sql`,
            "utf8",
        );
        return !applied.has(computeHash(content));
    });

    if (pending.length === 0) {
        console.log("Remote database is up to date. No pending migrations.");
        return;
    }

    for (const entry of pending) {
        const content = readFileSync(
            `${MIGRATIONS_FOLDER}/${entry.tag}.sql`,
            "utf8",
        );
        await applyMigration(entry.tag, computeHash(content), entry.when);
    }

    console.log(`Applied ${pending.length} migration(s) to remote database.`);
}

main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
});
