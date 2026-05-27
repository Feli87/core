CREATE TABLE `remote_config_versions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`config_id` integer NOT NULL,
	`version` integer NOT NULL,
	`name` text NOT NULL,
	`title` text,
	`description` text,
	`url` text,
	`image` text,
	`bg_color` text,
	`text_color` text,
	`change_note` text,
	`created_by` text,
	`created_at` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`config_id`) REFERENCES `remote_configs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_rc_versions_config` ON `remote_config_versions` (`config_id`);--> statement-breakpoint
ALTER TABLE `remote_configs` ADD `version` integer DEFAULT 1 NOT NULL;