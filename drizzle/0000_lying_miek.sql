CREATE TABLE `challenges` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_date` text NOT NULL,
	`ended_date` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_challenges_user_status` ON `challenges` (`user_id`,`status`);--> statement-breakpoint
CREATE TABLE `checkins` (
	`id` text PRIMARY KEY NOT NULL,
	`challenge_id` text NOT NULL,
	`user_id` text NOT NULL,
	`habit_date` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`timer_started_at` text NOT NULL,
	`completed_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`challenge_id`) REFERENCES `challenges`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_checkins_challenge_date` ON `checkins` (`challenge_id`,`habit_date`);--> statement-breakpoint
CREATE INDEX `idx_checkins_user_date` ON `checkins` (`user_id`,`habit_date`);--> statement-breakpoint
CREATE TABLE `timer_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`challenge_id` text NOT NULL,
	`user_id` text NOT NULL,
	`habit_date` text NOT NULL,
	`status` text DEFAULT 'running' NOT NULL,
	`started_at` text NOT NULL,
	`remaining_ms` integer DEFAULT 60000 NOT NULL,
	`pause_used` integer DEFAULT false NOT NULL,
	`paused_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`challenge_id`) REFERENCES `challenges`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_timer_sessions_challenge_status` ON `timer_sessions` (`challenge_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_timer_sessions_user_status` ON `timer_sessions` (`user_id`,`status`);--> statement-breakpoint
PRAGMA optimize;
