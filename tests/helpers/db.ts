import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { AppDatabase } from "@/core/db";
import { createSqliteDrizzleDatabase } from "@/core/db-sqlite";
import { eq, sql } from "drizzle-orm";
import { users } from "@/app/schema";

export type PlaywrightDatabase = AppDatabase;

export async function createPlaywrightDatabase(): Promise<{
    db: PlaywrightDatabase;
    dispose: () => Promise<void>;
}> {
    const directory = ".playwright/state/v3/d1/miniflare-D1DatabaseObject";
    const filenames = (await readdir(directory)).filter(
        (filename) =>
            filename.endsWith(".sqlite") && filename !== "metadata.sqlite",
    );
    const filename = filenames[0];
    if (filenames.length !== 1 || !filename) {
        throw new Error(
            `Expected one Playwright D1 database, found ${filenames.length}`,
        );
    }
    const sqlite = new DatabaseSync(join(directory, filename));
    sqlite.exec("PRAGMA foreign_keys = ON");
    sqlite.exec("PRAGMA busy_timeout = 5000");
    return {
        db: createSqliteDrizzleDatabase(sqlite),
        dispose: async () => sqlite.close(),
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
