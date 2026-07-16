import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { migrate } from "drizzle-orm/d1/migrator";
import { getPlatformProxy } from "wrangler";
import { $ } from "zx";
import { users } from "../src/schema.ts";
import { wranglerBin } from "./wrangler-bin.ts";

const DB_BINDING = "DB";

type UserRow = {
    username: string;
    displayName: string | null;
    email: string;
    admin: number | boolean;
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
            await prompt("Make admin on [local/remote]: ")
        ).toLowerCase();
        if (answer === "local" || answer === "remote") {
            return answer;
        }
        console.log('Please enter "local" or "remote".');
    }
}

async function promptUsername(existing: string[]): Promise<string> {
    while (true) {
        const username = await prompt("Username to make admin: ");
        if (username.length === 0) {
            console.log("Username is required.");
            continue;
        }
        if (!existing.includes(username)) {
            console.log(`User "${username}" not found.`);
            continue;
        }
        return username;
    }
}

function printUsers(rows: UserRow[]): void {
    if (rows.length === 0) {
        console.log("No users yet.");
        return;
    }
    console.log("Existing users:");
    console.table(
        rows.map((row) => ({
            username: row.username,
            displayName: row.displayName,
            email: row.email,
            admin: Boolean(row.admin),
        })),
    );
}

async function listLocalUsers(
    db: ReturnType<typeof drizzle>,
): Promise<UserRow[]> {
    const rows = await db
        .select({
            username: users.username,
            displayName: users.displayName,
            email: users.email,
            admin: users.admin,
        })
        .from(users)
        .orderBy(asc(users.username))
        .all();
    printUsers(rows);
    return rows;
}

async function makeLocalAdmin(
    db: ReturnType<typeof drizzle>,
    username: string,
): Promise<void> {
    const existing = await db
        .select({
            username: users.username,
            admin: users.admin,
        })
        .from(users)
        .where(eq(users.username, username))
        .get();

    if (!existing) {
        throw new Error(`User "${username}" not found`);
    }

    if (existing.admin) {
        console.log(`User "${username}" is already an admin.`);
        return;
    }

    await db
        .update(users)
        .set({ admin: true })
        .where(eq(users.username, username))
        .run();
    console.log(`Granted admin to local user "${username}".`);
}

function sqlString(value: string): string {
    return `'${value.replaceAll("'", "''")}'`;
}

type WranglerEnvelope<T> = {
    results: T[];
    success: boolean;
};

async function listRemoteUsers(): Promise<UserRow[]> {
    const { stdout } = await $`${process.execPath} ${[
        wranglerBin(),
        "d1",
        "execute",
        DB_BINDING,
        "--remote",
        "--json",
        "--command",
        "SELECT username, display_name AS displayName, email, admin FROM users ORDER BY username",
    ]}`;
    const parsed: WranglerEnvelope<UserRow>[] = JSON.parse(stdout);
    const [envelope] = parsed;
    if (!envelope) {
        throw new Error("Wrangler returned no result envelope");
    }
    printUsers(envelope.results);
    return envelope.results;
}

async function makeRemoteAdmin(username: string): Promise<void> {
    const command = `UPDATE users SET admin = 1 WHERE username = ${sqlString(username)}`;
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
    console.log(`Granted admin to remote user "${username}".`);
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
            const rows = await listLocalUsers(db);
            if (rows.length === 0) {
                return;
            }
            const username = await promptUsername(
                rows.map((row) => row.username),
            );
            await makeLocalAdmin(db, username);
        } finally {
            await platform.dispose();
        }
        return;
    }

    const rows = await listRemoteUsers();
    if (rows.length === 0) {
        return;
    }
    const username = await promptUsername(rows.map((row) => row.username));
    await makeRemoteAdmin(username);
}

main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
});
