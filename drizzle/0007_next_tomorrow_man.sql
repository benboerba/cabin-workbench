DROP INDEX `idx_schedule_entries_item_date`;--> statement-breakpoint
ALTER TABLE `schedule_entries` ADD `previous_progress` integer;--> statement-breakpoint
CREATE INDEX `idx_schedule_entries_item_date` ON `schedule_entries` (`item_id`,`entry_date`);