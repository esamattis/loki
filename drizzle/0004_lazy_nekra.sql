ALTER TABLE `aircrafts` ADD `archived` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `gear` ADD `archived` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `jump_types` ADD `archived` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `locations` ADD `archived` integer DEFAULT false NOT NULL;