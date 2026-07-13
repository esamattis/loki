import { resolve } from "node:path";
import { createSqliteDatabase, resolveSqlitePath } from "../src/db-sqlite.ts";
import { migrateSqlite } from "../src/migrate-sqlite.ts";

function main(): void {
    const path = resolveSqlitePath();
    const { path: absolutePath, sqlite } = createSqliteDatabase(path);
    try {
        migrateSqlite(sqlite, resolve("drizzle"));
        console.log(`SQLite migrations applied: ${absolutePath}`);
    } finally {
        sqlite.close();
    }
}

try {
    main();
} catch (error: unknown) {
    console.error(error);
    process.exit(1);
}
