PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_jumps` (
	`uuid` text PRIMARY KEY NOT NULL,
	`user_uuid` text NOT NULL,
	`location_uuid` text,
	`jump_number` integer NOT NULL,
	`jump_date` text NOT NULL,
	`exit_altitude` integer DEFAULT 0 NOT NULL,
	`opening_altitude` integer DEFAULT 0 NOT NULL,
	`freefall_time` integer DEFAULT 0 NOT NULL,
	`description` text,
	FOREIGN KEY (`user_uuid`) REFERENCES `users`(`uuid`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`location_uuid`) REFERENCES `locations`(`uuid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_jumps`("uuid", "user_uuid", "location_uuid", "jump_number", "jump_date", "exit_altitude", "opening_altitude", "freefall_time", "description") SELECT "uuid", "user_uuid", "location_uuid", "jump_number", "jump_date", "exit_altitude", "opening_altitude", "freefall_time", "description" FROM `jumps`;--> statement-breakpoint
DROP TABLE `jumps`;--> statement-breakpoint
ALTER TABLE `__new_jumps` RENAME TO `jumps`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `jumps_user_jump_number_unique` ON `jumps` (`user_uuid`,`jump_number`);