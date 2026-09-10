CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`category` text NOT NULL,
	`spent_on` text NOT NULL,
	`created_at` integer NOT NULL
);
