CREATE TABLE `sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_uuid` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_uuid`) REFERENCES `users`(`uuid`) ON UPDATE no action ON DELETE cascade
);
