CREATE TABLE `portal_links` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`category` text NOT NULL,
	`label` text NOT NULL,
	`url` text NOT NULL,
	`icon` text NOT NULL,
	`color` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`default_key` text,
	`is_default` integer DEFAULT false NOT NULL,
	`is_visible` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_portal_links_user_category_order` ON `portal_links` (`user_id`,`category`,`sort_order`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_portal_links_user_default_key` ON `portal_links` (`user_id`,`default_key`);--> statement-breakpoint
PRAGMA optimize;
