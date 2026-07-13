import { relations } from "drizzle-orm";
import {
    sqliteTable,
    integer,
    text,
    primaryKey,
    uniqueIndex,
} from "drizzle-orm/sqlite-core";
// Keep this default stable (`{}`). App code fills full options JSON on insert.
// Putting DEFAULT_USER_OPTIONS_JSON here made drizzle-kit rebuild `users` (and
// cascade-delete jumps) whenever the options default string changed.
export const users = sqliteTable("users", {
    uuid: text("uuid")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    username: text("username").unique().notNull(),
    displayName: text("display_name"),
    password: text("password").notNull(),
    email: text("email").notNull(),
    options: text("options").notNull().default("{}"),
    admin: integer("admin", { mode: "boolean" }).notNull().default(false),
});

export const invitations = sqliteTable("invitations", {
    code: text("code").primaryKey(),
    count: integer("count").notNull().default(0),
});

export const locations = sqliteTable("locations", {
    uuid: text("uuid")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    userUuid: text("user_uuid")
        .references(() => users.uuid, { onDelete: "cascade" })
        .notNull(),
    name: text("name").notNull(),
    previousJumpCount: integer("previous_jump_count").notNull().default(0),
    description: text("description"),
    archived: integer("archived", { mode: "boolean" }).notNull().default(false),
});

export const aircrafts = sqliteTable("aircrafts", {
    uuid: text("uuid")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    userUuid: text("user_uuid")
        .references(() => users.uuid, { onDelete: "cascade" })
        .notNull(),
    name: text("name").notNull(),
    previousJumpCount: integer("previous_jump_count").notNull().default(0),
    description: text("description"),
    archived: integer("archived", { mode: "boolean" }).notNull().default(false),
});

export const gear = sqliteTable("gear", {
    uuid: text("uuid")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    userUuid: text("user_uuid")
        .references(() => users.uuid, { onDelete: "cascade" })
        .notNull(),
    name: text("name").notNull(),
    previousUsageCount: integer("previous_usage_count").notNull().default(0),
    description: text("description"),
    archived: integer("archived", { mode: "boolean" }).notNull().default(false),
});

export const jumpTypes = sqliteTable("jump_types", {
    uuid: text("uuid")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    userUuid: text("user_uuid")
        .references(() => users.uuid, { onDelete: "cascade" })
        .notNull(),
    name: text("name").notNull(),
    previousUsageCount: integer("previous_usage_count").notNull().default(0),
    description: text("description"),
    archived: integer("archived", { mode: "boolean" }).notNull().default(false),
});

export const jumps = sqliteTable(
    "jumps",
    {
        uuid: text("uuid")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        userUuid: text("user_uuid")
            .references(() => users.uuid, { onDelete: "cascade" })
            .notNull(),
        locationUuid: text("location_uuid")
            .references(() => locations.uuid, { onDelete: "cascade" })
            .notNull(),
        aircraftUuid: text("aircraft_uuid")
            .references(() => aircrafts.uuid, { onDelete: "cascade" })
            .notNull(),
        jumpNumber: integer("jump_number").notNull(),
        jumpDate: text("jump_date").notNull(),
        exitAltitude: integer("exit_altitude").notNull().default(0),
        openingAltitude: integer("opening_altitude").notNull().default(0),
        freefallTime: integer("freefall_time").notNull().default(0),
        description: text("description"),
    },
    (t) => ({
        userJumpNumber: uniqueIndex("jumps_user_jump_number_unique").on(
            t.userUuid,
            t.jumpNumber,
        ),
    }),
);

export const jumpsToGear = sqliteTable(
    "jumps_to_gear",
    {
        jumpUuid: text("jump_uuid")
            .references(() => jumps.uuid, { onDelete: "cascade" })
            .notNull(),
        gearUuid: text("gear_uuid")
            .references(() => gear.uuid, { onDelete: "cascade" })
            .notNull(),
    },
    (t) => ({
        pk: primaryKey({ columns: [t.jumpUuid, t.gearUuid] }),
    }),
);

export const jumpsToJumpTypes = sqliteTable(
    "jumps_to_jump_types",
    {
        jumpUuid: text("jump_uuid")
            .references(() => jumps.uuid, { onDelete: "cascade" })
            .notNull(),
        jumpTypeUuid: text("jump_type_uuid")
            .references(() => jumpTypes.uuid, { onDelete: "cascade" })
            .notNull(),
    },
    (t) => ({
        pk: primaryKey({ columns: [t.jumpUuid, t.jumpTypeUuid] }),
    }),
);

export const sessions = sqliteTable("sessions", {
    // SHA-256 hex of the raw token (never the raw token, never the user UUID)
    tokenHash: text("token_hash").primaryKey(),
    userUuid: text("user_uuid")
        .references(() => users.uuid, { onDelete: "cascade" })
        .notNull(),
    createdAt: integer("created_at").notNull(), // unix seconds
    expiresAt: integer("expires_at").notNull(), // unix seconds
    lastUsedAt: integer("last_used_at").notNull(), // unix seconds
});

export const aiUsage = sqliteTable("ai_usage", {
    uuid: text("uuid")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    userUuid: text("user_uuid")
        .references(() => users.uuid, { onDelete: "cascade" })
        .notNull(),
    model: text("model").notNull(),
    title: text("title").notNull(),
    createdAt: integer("created_at").notNull(), // unix seconds
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    totalTokens: integer("total_tokens"),
});

export const usersRelations = relations(users, ({ many }) => ({
    jumps: many(jumps),
    gear: many(gear),
    jumpTypes: many(jumpTypes),
    locations: many(locations),
    aircrafts: many(aircrafts),
    aiUsage: many(aiUsage),
}));

export const aiUsageRelations = relations(aiUsage, ({ one }) => ({
    user: one(users, {
        fields: [aiUsage.userUuid],
        references: [users.uuid],
    }),
}));

export const locationsRelations = relations(locations, ({ one, many }) => ({
    user: one(users, {
        fields: [locations.userUuid],
        references: [users.uuid],
    }),
    jumps: many(jumps),
}));

export const aircraftsRelations = relations(aircrafts, ({ one, many }) => ({
    user: one(users, {
        fields: [aircrafts.userUuid],
        references: [users.uuid],
    }),
    jumps: many(jumps),
}));

export const gearRelations = relations(gear, ({ one, many }) => ({
    user: one(users, { fields: [gear.userUuid], references: [users.uuid] }),
    jumps: many(jumpsToGear),
}));

export const jumpTypesRelations = relations(jumpTypes, ({ one, many }) => ({
    user: one(users, {
        fields: [jumpTypes.userUuid],
        references: [users.uuid],
    }),
    jumps: many(jumpsToJumpTypes),
}));

export const jumpsRelations = relations(jumps, ({ one, many }) => ({
    user: one(users, { fields: [jumps.userUuid], references: [users.uuid] }),
    location: one(locations, {
        fields: [jumps.locationUuid],
        references: [locations.uuid],
    }),
    aircraft: one(aircrafts, {
        fields: [jumps.aircraftUuid],
        references: [aircrafts.uuid],
    }),
    gears: many(jumpsToGear),
    jumpTypes: many(jumpsToJumpTypes),
}));

export const jumpsToGearRelations = relations(jumpsToGear, ({ one }) => ({
    jump: one(jumps, {
        fields: [jumpsToGear.jumpUuid],
        references: [jumps.uuid],
    }),
    gear: one(gear, {
        fields: [jumpsToGear.gearUuid],
        references: [gear.uuid],
    }),
}));

export const jumpsToJumpTypesRelations = relations(
    jumpsToJumpTypes,
    ({ one }) => ({
        jump: one(jumps, {
            fields: [jumpsToJumpTypes.jumpUuid],
            references: [jumps.uuid],
        }),
        jumpType: one(jumpTypes, {
            fields: [jumpsToJumpTypes.jumpTypeUuid],
            references: [jumpTypes.uuid],
        }),
    }),
);
