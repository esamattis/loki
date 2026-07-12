import { relations } from "drizzle-orm";
import {
  sqliteTable,
  integer,
  text,
  primaryKey,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  uuid: text("uuid")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  username: text("username").unique().notNull(),
  displayName: text("display_name"),
  password: text("password").notNull(),
  email: text("email").notNull(),
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
});

export const jumps = sqliteTable("jumps", {
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
  description: text("description"),
});

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

export const usersRelations = relations(users, ({ many }) => ({
  jumps: many(jumps),
  gear: many(gear),
  jumpTypes: many(jumpTypes),
  locations: many(locations),
  aircrafts: many(aircrafts),
}));

export const locationsRelations = relations(locations, ({ one, many }) => ({
  user: one(users, { fields: [locations.userUuid], references: [users.uuid] }),
  jumps: many(jumps),
}));

export const aircraftsRelations = relations(aircrafts, ({ one, many }) => ({
  user: one(users, { fields: [aircrafts.userUuid], references: [users.uuid] }),
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
