import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { migrate } from "drizzle-orm/d1/migrator";
import { getPlatformProxy } from "wrangler";
import { hashPassword } from "../../src/core/password.ts";
import { users } from "../../src/core/schema.ts";

function readArguments(): { username: string; password: string } {
    const [username, password, ...extra] = process.argv.slice(2);
    if (!username || !password || extra.length > 0) {
        throw new Error(
            "Usage: pn db:reset-password <username> <new-password>",
        );
    }
    if (password.length < 6) {
        throw new Error("Password must be at least 6 characters");
    }
    return { username, password };
}

async function main(): Promise<void> {
    const args = readArguments();
    const platform = await getPlatformProxy<CloudflareBindings>({
        configPath: "wrangler.jsonc",
        remoteBindings: false,
    });

    try {
        const db = drizzle(platform.env.DB);
        await migrate(db, { migrationsFolder: "drizzle" });
        const user = await db
            .select({ uuid: users.uuid })
            .from(users)
            .where(eq(users.username, args.username))
            .get();
        if (!user) {
            throw new Error(`Local user "${args.username}" not found`);
        }

        await db
            .update(users)
            .set({ password: await hashPassword(args.password) })
            .where(eq(users.uuid, user.uuid))
            .run();
        console.log(`Reset password for local user "${args.username}".`);
    } finally {
        await platform.dispose();
    }
}

main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
});
