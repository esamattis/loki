import { eq, sql } from "drizzle-orm";
import type { AppDatabase } from "@/core/db";
import {
    CoreUserOptionsSchema,
    parseCoreUserOptions,
    type CoreUserOptions,
} from "@/core/options";
import { users } from "@/core/schema";

/** Describes user data. */
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

/** Provides user behavior. */
export class User {
    readonly username: string;
    readonly uuid: string;
    readonly displayName: string | null;
    readonly email: string;
    options: CoreUserOptions;
    /** From options.readonly; set at auth so middleware needs no extra query. */
    readonly: boolean;
    readonly admin: boolean;
    htmlCacheGeneration: number;
    readonly #db: AppDatabase;

    /** Creates a user model from a database row. */
    constructor(db: AppDatabase, user: UserData) {
        const options = parseCoreUserOptions(user.options);
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

    /** Returns the display name, falling back to the username. */
    getDisplayName(): string {
        return this.displayName || this.username;
    }

    /** Updates the core-owned subset of user options. */
    async updateCoreOptions(
        updates: Partial<
            Pick<
                CoreUserOptions,
                | "dateTimeFormat"
                | "numberFormat"
                | "htmlCacheEnabled"
                | "privacyPolicyAccepted"
                | "readonly"
            >
        >,
    ): Promise<void> {
        await this.replaceOptions({ ...this.options, ...updates });
    }

    /** Validates and replaces user options while invalidating cached HTML. */
    async replaceOptions(optionsValue: Record<string, unknown>): Promise<void> {
        const options = CoreUserOptionsSchema.parse({
            ...this.options,
            ...optionsValue,
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
