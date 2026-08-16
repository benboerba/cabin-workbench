CREATE TABLE `tool_usage` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`tool_key` text NOT NULL,
	`open_count` integer DEFAULT 0 NOT NULL,
	`first_seen_at` text NOT NULL,
	`last_opened_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_tool_usage_user_tool` ON `tool_usage` (`user_id`,`tool_key`);