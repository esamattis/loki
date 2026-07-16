import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { migrate } from "drizzle-orm/d1/migrator";
import { getPlatformProxy } from "wrangler";
import { $ } from "zx";
import { invitations } from "../src/schema.ts";
import { wranglerBin } from "./wrangler-bin.ts";

const DB_BINDING = "DB";

type InvitationRow = {
    code: string;
    count: number;
};

async function prompt(question: string): Promise<string> {
    const rl = createInterface({ input, output });
    try {
        return (await rl.question(question)).trim();
    } finally {
        rl.close();
    }
}

async function promptTarget(): Promise<"local" | "remote"> {
    while (true) {
        const answer = (
            await prompt("Create invitation on [local/remote]: ")
        ).toLowerCase();
        if (answer === "local" || answer === "remote") {
            return answer;
        }
        console.log('Please enter "local" or "remote".');
    }
}

async function promptCode(): Promise<string> {
    while (true) {
        const code = await prompt("Invitation code: ");
        if (code.length > 0) {
            return code;
        }
        console.log("Code is required.");
    }
}

async function promptCount(): Promise<number> {
    while (true) {
        const raw = await prompt("Number of uses: ");
        const count = Number(raw);
        if (Number.isInteger(count) && count > 0) {
            return count;
        }
        console.log("Enter a positive integer.");
    }
}

function printInvitations(rows: InvitationRow[]): void {
    if (rows.length === 0) {
        console.log("No invitations yet.");
        return;
    }
    console.log("Existing invitations:");
    console.table(rows);
}

async function listLocalInvitations(
    db: ReturnType<typeof drizzle>,
): Promise<void> {
    const rows = await db
        .select({
            code: invitations.code,
            count: invitations.count,
        })
        .from(invitations)
        .orderBy(asc(invitations.code))
        .all();
    printInvitations(rows);
}

async function createLocal(
    db: ReturnType<typeof drizzle>,
    code: string,
    count: number,
): Promise<void> {
    const existing = await db
        .select({ code: invitations.code, count: invitations.count })
        .from(invitations)
        .where(eq(invitations.code, code))
        .get();

    if (existing) {
        await db
            .update(invitations)
            .set({ count })
            .where(eq(invitations.code, code))
            .run();
        console.log(
            `Updated local invitation "${code}" to ${count} use(s) (was ${existing.count}).`,
        );
        return;
    }

    await db.insert(invitations).values({ code, count }).run();
    console.log(`Created local invitation "${code}" with ${count} use(s).`);
}

function sqlString(value: string): string {
    return `'${value.replaceAll("'", "''")}'`;
}

type WranglerEnvelope<T> = {
    results: T[];
    success: boolean;
};

async function listRemoteInvitations(): Promise<void> {
    const { stdout } = await $`${process.execPath} ${[
        wranglerBin(),
        "d1",
        "execute",
        DB_BINDING,
        "--remote",
        "--json",
        "--command",
        "SELECT code, count FROM invitations ORDER BY code",
    ]}`;
    const parsed: WranglerEnvelope<InvitationRow>[] = JSON.parse(stdout);
    const [envelope] = parsed;
    if (!envelope) {
        throw new Error("Wrangler returned no result envelope");
    }
    printInvitations(envelope.results);
}

async function createRemote(code: string, count: number): Promise<void> {
    const command = `INSERT INTO invitations (code, count) VALUES (${sqlString(code)}, ${count}) ON CONFLICT(code) DO UPDATE SET count = excluded.count`;
    const { stdout, stderr } = await $`${process.execPath} ${[
        wranglerBin(),
        "d1",
        "execute",
        DB_BINDING,
        "--remote",
        "--command",
        command,
    ]}`;
    process.stdout.write(stdout);
    process.stderr.write(stderr);
    console.log(
        `Created/updated remote invitation "${code}" with ${count} use(s).`,
    );
}

async function main(): Promise<void> {
    const target = await promptTarget();

    if (target === "local") {
        const platform = await getPlatformProxy<CloudflareBindings>({
            configPath: "wrangler.jsonc",
            remoteBindings: false,
        });

        try {
            const db = drizzle(platform.env.DB);
            await migrate(db, { migrationsFolder: "drizzle" });
            await listLocalInvitations(db);
            const code = await promptCode();
            const count = await promptCount();
            await createLocal(db, code, count);
        } finally {
            await platform.dispose();
        }
        return;
    }

    await listRemoteInvitations();
    const code = await promptCode();
    const count = await promptCount();
    await createRemote(code, count);
}

main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
});
