import { eq, sql } from "drizzle-orm";
import type { AppDatabase } from "@/db";
import {
    parseUserOptions,
    UserOptionsSchema,
    type UserOptions,
} from "@/options";
import { users } from "@/schema";

type UserData = Pick<
    typeof users.$inferSelect,
    | "uuid"
    | "username"
    | "displayName"
    | "email"
    | "options"
    | "admin"
    | "htmlCacheGeneration"
>;

export class User {
    readonly username: string;
    readonly uuid: string;
    readonly displayName: string | null;
    readonly email: string;
    options: UserOptions;
    /** From options.readonly; set at auth so middleware needs no extra query. */
    readonly: boolean;
    readonly admin: boolean;
    htmlCacheGeneration: number;
    readonly #db: AppDatabase;

    constructor(db: AppDatabase, user: UserData) {
        const options = parseUserOptions(user.options);
        this.#db = db;
        this.username = user.username;
        this.uuid = user.uuid;
        this.displayName = user.displayName;
        this.email = user.email;
        this.options = options;
        this.readonly = options.readonly;
        this.admin = user.admin;
        this.htmlCacheGeneration = user.htmlCacheGeneration;
    }

    getDisplayName(): string {
        return this.displayName || this.username;
    }

    async updateOptions(updates: Partial<UserOptions>): Promise<void> {
        const options = UserOptionsSchema.parse({
            ...this.options,
            ...updates,
        });
        await this.#db
            .update(users)
            .set({
                options: JSON.stringify(options),
                // Options may change during GETs such as CSV export, where the
                // POST middleware cannot invalidate option-dependent HTML.
                htmlCacheGeneration: sql`${users.htmlCacheGeneration} + 1`,
            })
            .where(eq(users.uuid, this.uuid))
            .run();
        this.options = options;
        this.readonly = options.readonly;
        this.htmlCacheGeneration += 1;
    }
}
