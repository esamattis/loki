import {
    integer,
    sqliteTable,
    text,
    uniqueIndex,
} from "drizzle-orm/sqlite-core";

// Keep this default stable. Concrete applications fill their complete options JSON.
export const users = sqliteTable(
    "users",
    {
        uuid: text("uuid")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        username: text("username").unique().notNull(),
        displayName: text("display_name"),
        password: text("password").notNull(),
        email: text("email").notNull(),
        invitationCode: text("invitation_code"),
        options: text("options").notNull().default("{}"),
        admin: integer("admin", { mode: "boolean" }).notNull().default(false),
        htmlCacheGeneration: integer("html_cache_generation")
            .notNull()
            .default(0),
        createdAt: integer("created_at")
            .notNull()
            .default(0)
            .$defaultFn(() => Math.floor(Date.now() / 1000)),
        lastUsedAt: integer("last_used_at")
            .notNull()
            .default(0)
            .$defaultFn(() => Math.floor(Date.now() / 1000)),
    },
    (table) => ({
        emailUnique: uniqueIndex("users_email_unique").on(table.email),
    }),
);

export const invitations = sqliteTable("invitations", {
    code: text("code").primaryKey(),
    count: integer("count").notNull().default(0),
});

export const sessions = sqliteTable("sessions", {
    tokenHash: text("token_hash").primaryKey(),
    userUuid: text("user_uuid")
        .references(() => users.uuid, { onDelete: "cascade" })
        .notNull(),
    createdAt: integer("created_at").notNull(),
    expiresAt: integer("expires_at").notNull(),
    lastUsedAt: integer("last_used_at").notNull(),
});
