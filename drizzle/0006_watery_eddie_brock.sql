CREATE TABLE `daily_phrase_states` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`phrase_date` text NOT NULL,
	`phrase_id` text NOT NULL,
	`swap_count` integer DEFAULT 0 NOT NULL,
	`learned_at` text,
	`favorite_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_daily_phrase_states_user_date` ON `daily_phrase_states` (`user_id`,`phrase_date`);--> statement-breakpoint
CREATE INDEX `idx_daily_phrase_states_user_favorite` ON `daily_phrase_states` (`user_id`,`favorite_at`);