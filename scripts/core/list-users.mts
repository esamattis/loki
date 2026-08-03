import { asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { migrate } from "drizzle-orm/d1/migrator";
import { getPlatformProxy } from "wrangler";
import { users } from "../../src/core/schema.ts";

async function main(): Promise<void> {
    const platform = await getPlatformProxy<CloudflareBindings>({
        configPath: "wrangler.jsonc",
        remoteBindings: false,
    });

    try {
        const db = drizzle(platform.env.DB);
        await migrate(db, { migrationsFolder: "drizzle" });
        const userRows = await db
            .select({
                uuid: users.uuid,
                username: users.username,
                displayName: users.displayName,
                email: users.email,
            })
            .from(users)
            .orderBy(asc(users.username))
            .all();

        console.table(userRows);
    } finally {
        await platform.dispose();
    }
}

main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
});
