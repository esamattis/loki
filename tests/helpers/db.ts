import { getPlatformProxy } from "wrangler";
import { createD1Database, type AppDatabase } from "@/core/db";
import { eq, sql } from "drizzle-orm";
import { users } from "@/app/schema";

export type PlaywrightDatabase = AppDatabase;

export async function createPlaywrightDatabase(): Promise<{
    db: PlaywrightDatabase;
    dispose: () => Promise<void>;
}> {
    const platform = await getPlatformProxy<CloudflareBindings>({
        persist: { path: ".playwright/state/v3" },
        remoteBindings: false,
    });
    return {
        db: createD1Database(platform.env.DB),
        dispose: platform.dispose,
    };
}

export async function updatePlaywrightUserOptions(
    db: PlaywrightDatabase,
    options: {
        username: string;
        updates: Record<string, unknown>;
        invalidateHtmlCache?: boolean;
    },
): Promise<void> {
    const [user] = await db
        .select({ options: users.options })
        .from(users)
        .where(eq(users.username, options.username));
    if (!user) {
        throw new Error(`Expected user ${options.username}`);
    }
    await db
        .update(users)
        .set({
            options: JSON.stringify({
                ...JSON.parse(user.options),
                ...options.updates,
            }),
            ...(options.invalidateHtmlCache
                ? {
                      htmlCacheGeneration: sql`${users.htmlCacheGeneration} + 1`,
                  }
                : {}),
        })
        .where(eq(users.username, options.username));
}
