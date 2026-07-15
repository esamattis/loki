CREATE TABLE `ai_usage` (
	`uuid` text PRIMARY KEY NOT NULL,
	`user_uuid` text,
	`model` text NOT NULL,
	`title` text NOT NULL,
	`created_at` integer NOT NULL,
	`input_tokens` integer,
	`output_tokens` integer,
	`total_tokens` integer,
	FOREIGN KEY (`user_uuid`) REFERENCES `users`(`uuid`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `aircrafts` (
	`uuid` text PRIMARY KEY NOT NULL,
	`user_uuid` text NOT NULL,
	`name` text NOT NULL,
	`previous_jump_count` integer DEFAULT 0 NOT NULL,
	`description` text,
	`archived` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`user_uuid`) REFERENCES `users`(`uuid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `gear` (
	`uuid` text PRIMARY KEY NOT NULL,
	`user_uuid` text NOT NULL,
	`name` text NOT NULL,
	`previous_usage_count` integer DEFAULT 0 NOT NULL,
	`description` text,
	`archived` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`user_uuid`) REFERENCES `users`(`uuid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `invitations` (
	`code` text PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `jump_types` (
	`uuid` text PRIMARY KEY NOT NULL,
	`user_uuid` text NOT NULL,
	`name` text NOT NULL,
	`previous_usage_count` integer DEFAULT 0 NOT NULL,
	`description` text,
	`archived` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`user_uuid`) REFERENCES `users`(`uuid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `jumps` (
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
CREATE UNIQUE INDEX `jumps_user_jump_number_unique` ON `jumps` (`user_uuid`,`jump_number`);--> statement-breakpoint
CREATE TABLE `jumps_to_aircrafts` (
	`jump_uuid` text NOT NULL,
	`aircraft_uuid` text NOT NULL,
	PRIMARY KEY(`jump_uuid`, `aircraft_uuid`),
	FOREIGN KEY (`jump_uuid`) REFERENCES `jumps`(`uuid`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`aircraft_uuid`) REFERENCES `aircrafts`(`uuid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `jumps_to_gear` (
	`jump_uuid` text NOT NULL,
	`gear_uuid` text NOT NULL,
	PRIMARY KEY(`jump_uuid`, `gear_uuid`),
	FOREIGN KEY (`jump_uuid`) REFERENCES `jumps`(`uuid`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`gear_uuid`) REFERENCES `gear`(`uuid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `jumps_to_jump_types` (
	`jump_uuid` text NOT NULL,
	`jump_type_uuid` text NOT NULL,
	PRIMARY KEY(`jump_uuid`, `jump_type_uuid`),
	FOREIGN KEY (`jump_uuid`) REFERENCES `jumps`(`uuid`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`jump_type_uuid`) REFERENCES `jump_types`(`uuid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `locations` (
	`uuid` text PRIMARY KEY NOT NULL,
	`user_uuid` text NOT NULL,
	`name` text NOT NULL,
	`previous_jump_count` integer DEFAULT 0 NOT NULL,
	`description` text,
	`archived` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`user_uuid`) REFERENCES `users`(`uuid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_uuid` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`last_used_at` integer NOT NULL,
	FOREIGN KEY (`user_uuid`) REFERENCES `users`(`uuid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`uuid` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`display_name` text,
	`password` text NOT NULL,
	`email` text NOT NULL,
	`invitation_code` text,
	`options` text DEFAULT '{}' NOT NULL,
	`admin` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);