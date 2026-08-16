CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`recipient_username` text NOT NULL,
	`actor_username` text,
	`item_id` text,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`unique_key` text,
	`read_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `schedule_items`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_notifications_recipient_created` ON `notifications` (`recipient_username`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_notifications_recipient_read` ON `notifications` (`recipient_username`,`read_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_notifications_unique_key` ON `notifications` (`unique_key`);--> statement-breakpoint
CREATE TABLE `schedule_participants` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`username` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `schedule_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_schedule_participants_item_username` ON `schedule_participants` (`item_id`,`username`);--> statement-breakpoint
CREATE INDEX `idx_schedule_participants_username` ON `schedule_participants` (`username`);--> statement-breakpoint
PRAGMA optimize;
