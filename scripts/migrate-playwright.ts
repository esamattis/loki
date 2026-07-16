import { readFile } from "node:fs/promises";
import { $ } from "zx";
import { wranglerBin } from "./wrangler-bin.ts";

type MigrationJournal = {
    entries: Array<{ tag: string }>;
};

async function main(): Promise<void> {
    const journal: MigrationJournal = JSON.parse(
        await readFile("drizzle/meta/_journal.json", "utf8"),
    );

    for (const { tag } of journal.entries) {
        const { stdout, stderr } = await $`${process.execPath} ${[
            wranglerBin(),
            "d1",
            "execute",
            "DB",
            "--local",
            "--persist-to",
            ".playwright/state",
            "--file",
            `drizzle/${tag}.sql`,
        ]}`;
        process.stdout.write(stdout);
        process.stderr.write(stderr);
    }
}

main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
});
