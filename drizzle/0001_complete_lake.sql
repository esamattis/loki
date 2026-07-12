CREATE TABLE `jump_types` (
	`uuid` text PRIMARY KEY NOT NULL,
	`user_uuid` text NOT NULL,
	`name` text NOT NULL,
	`previous_usage_count` integer DEFAULT 0 NOT NULL,
	`description` text,
	FOREIGN KEY (`user_uuid`) REFERENCES `users`(`uuid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `jumps_to_jump_types` (
	`jump_uuid` text NOT NULL,
	`jump_type_uuid` text NOT NULL,
	PRIMARY KEY(`jump_uuid`, `jump_type_uuid`),
	FOREIGN KEY (`jump_uuid`) REFERENCES `jumps`(`uuid`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`jump_type_uuid`) REFERENCES `jump_types`(`uuid`) ON UPDATE no action ON DELETE cascade
);
