PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_ai_usage` (
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
INSERT INTO `__new_ai_usage`("uuid", "user_uuid", "model", "title", "created_at", "input_tokens", "output_tokens", "total_tokens") SELECT "uuid", "user_uuid", "model", "title", "created_at", "input_tokens", "output_tokens", "total_tokens" FROM `ai_usage`;--> statement-breakpoint
DROP TABLE `ai_usage`;--> statement-breakpoint
ALTER TABLE `__new_ai_usage` RENAME TO `ai_usage`;--> statement-breakpoint
PRAGMA foreign_keys=ON;