ALTER TABLE `schedule_items` ADD `parent_item_id` text;--> statement-breakpoint
CREATE INDEX `idx_schedule_items_parent_status` ON `schedule_items` (`parent_item_id`,`status`);