import { drizzle as drizzleD1 } from "drizzle-orm/d1";

/** App DB client. D1-shaped so existing `.batch` / query typings keep working. */
export type AppDatabase = ReturnType<typeof drizzleD1>;

export function createD1Database(d1: D1Database): AppDatabase {
    return drizzleD1(d1);
}
