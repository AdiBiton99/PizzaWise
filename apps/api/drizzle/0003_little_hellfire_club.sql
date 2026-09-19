CREATE TABLE `order_toppings` (
	`order_id` binary(16) NOT NULL,
	`topping_tag` varchar(64) NOT NULL,
	CONSTRAINT `order_toppings_order_id_topping_tag_pk` PRIMARY KEY(`order_id`,`topping_tag`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` binary(16) NOT NULL,
	`user_id` binary(16) NOT NULL,
	`pizzeria_id` varchar(128) NOT NULL,
	`pizzeria_name` varchar(255) NOT NULL,
	`size_tag` varchar(64) NOT NULL,
	`crust_tag` varchar(64) NOT NULL,
	`sauce_tag` varchar(64) NOT NULL,
	`amount_minor` int NOT NULL,
	`currency` varchar(16) NOT NULL,
	`phone` varchar(20) NOT NULL,
	`fulfillment_type` varchar(32) NOT NULL,
	`delivery_address` varchar(200),
	`status` varchar(32) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `order_toppings` ADD CONSTRAINT `order_toppings_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `orders_user_id_idx` ON `orders` (`user_id`);