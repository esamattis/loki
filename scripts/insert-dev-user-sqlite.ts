import { eq } from "drizzle-orm";
import { resolve } from "node:path";
import { createSqliteDatabase, resolveSqlitePath } from "../src/db-sqlite.ts";
import { migrateSqlite } from "../src/migrate-sqlite.ts";
import { DEFAULT_USER_OPTIONS_JSON } from "../src/options.ts";
import { users } from "../src/schema.ts";

const username = "developer";
const displayName = "Developer User";
const email = "developer@example.test";
const password = "developer123";
const pbkdf2Iterations = 100_000;

function bytesToBase64(bytes: Uint8Array): string {
    let binary = "";
    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }
    return btoa(binary);
}

async function hashPassword(value: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(16)));
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(value),
        "PBKDF2",
        false,
        ["deriveBits"],
    );
    const derived = await crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            salt,
            iterations: pbkdf2Iterations,
            hash: "SHA-256",
        },
        keyMaterial,
        256,
    );
    return `${pbkdf2Iterations}:${bytesToBase64(salt)}:${bytesToBase64(new Uint8Array(derived))}`;
}

async function main(): Promise<void> {
    const path = resolveSqlitePath();
    const { db, path: absolutePath, sqlite } = createSqliteDatabase(path);
    try {
        migrateSqlite(sqlite, resolve("drizzle"));
        const passwordHash = await hashPassword(password);
        const existingUser = await db
            .select({ uuid: users.uuid })
            .from(users)
            .where(eq(users.username, username))
            .get();

        if (existingUser) {
            await db
                .update(users)
                .set({
                    displayName,
                    password: passwordHash,
                    email,
                    admin: true,
                })
                .where(eq(users.uuid, existingUser.uuid))
                .run();
        } else {
            await db
                .insert(users)
                .values({
                    username,
                    displayName,
                    password: passwordHash,
                    email,
                    options: DEFAULT_USER_OPTIONS_JSON,
                    admin: true,
                })
                .run();
        }

        console.log(`Developer user ready: ${username} / ${password}`);
        console.log(`SQLite database: ${absolutePath}`);
    } finally {
        sqlite.close();
    }
}

main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
});
