import { drizzle } from "drizzle-orm/d1";
import { migrate } from "drizzle-orm/d1/migrator";
import { getPlatformProxy } from "wrangler";

async function main(): Promise<void> {
    const platform = await getPlatformProxy<CloudflareBindings>({
        configPath: "wrangler.jsonc",
        remoteBindings: false,
        persist: process.env.PLAYWRIGHT_TEST
            ? { path: ".playwright/state" }
            : undefined,
    });

    try {
        await migrate(drizzle(platform.env.DB), {
            migrationsFolder: "drizzle",
        });
        console.log("Local database Drizzle migrations have been run.");
    } finally {
        await platform.dispose();
    }
}

main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
});
