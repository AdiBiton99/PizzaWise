CREATE TABLE `profiles` (
	`user_id` binary(16) NOT NULL,
	`display_name` varchar(80) NOT NULL,
	`phone` varchar(20) NOT NULL,
	CONSTRAINT `profiles_user_id` PRIMARY KEY(`user_id`)
);
--> statement-breakpoint
ALTER TABLE `profiles` ADD CONSTRAINT `profiles_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;