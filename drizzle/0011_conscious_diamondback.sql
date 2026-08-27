CREATE TABLE `meal_recipes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`category` text DEFAULT 'other' NOT NULL,
	`image_data` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_by_user_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_meal_recipes_active_category` ON `meal_recipes` (`is_active`,`category`);--> statement-breakpoint
CREATE TABLE `meal_selections` (
	`id` text PRIMARY KEY NOT NULL,
	`recipe_id` text NOT NULL,
	`user_id` text NOT NULL,
	`meal_date` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `meal_recipes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_meal_selections_recipe_user_date` ON `meal_selections` (`recipe_id`,`user_id`,`meal_date`);--> statement-breakpoint
CREATE INDEX `idx_meal_selections_date` ON `meal_selections` (`meal_date`);--> statement-breakpoint
CREATE INDEX `idx_meal_selections_user_date` ON `meal_selections` (`user_id`,`meal_date`);