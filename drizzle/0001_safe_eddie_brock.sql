CREATE TABLE `schedule_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`user_id` text NOT NULL,
	`entry_date` text NOT NULL,
	`action` text NOT NULL,
	`progress` integer,
	`note` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `schedule_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_schedule_entries_item_date` ON `schedule_entries` (`item_id`,`entry_date`);--> statement-breakpoint
CREATE INDEX `idx_schedule_entries_user_date` ON `schedule_entries` (`user_id`,`entry_date`);--> statement-breakpoint
CREATE TABLE `schedule_items` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`repeat_daily` integer DEFAULT false NOT NULL,
	`start_date` text NOT NULL,
	`due_date` text,
	`progress` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`completed_date` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_schedule_items_user_status` ON `schedule_items` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_schedule_items_user_kind` ON `schedule_items` (`user_id`,`kind`);--> statement-breakpoint
PRAGMA optimize;
