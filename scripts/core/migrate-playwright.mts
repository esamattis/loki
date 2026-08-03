import { readMigrationFiles } from "drizzle-orm/migrator";
import { $ } from "zx";
import { wranglerBin } from "./wrangler-bin.mts";

async function main(): Promise<void> {
    const migrations = readMigrationFiles({ migrationsFolder: "drizzle" });
    for (const migration of migrations) {
        const { stdout, stderr } = await $`${process.execPath} ${[
            wranglerBin(),
            "d1",
            "execute",
            "DB",
            "--local",
            "--persist-to",
            ".playwright/state",
            "--file",
            `drizzle/${migration.name}/migration.sql`,
        ]}`;
        process.stdout.write(stdout);
        process.stderr.write(stderr);
    }
}

main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
});
