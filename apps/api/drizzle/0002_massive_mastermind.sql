CREATE TABLE `favorite_pizza_toppings` (
	`favorite_pizza_id` binary(16) NOT NULL,
	`topping_tag` varchar(64) NOT NULL,
	CONSTRAINT `favorite_pizza_toppings_favorite_pizza_id_topping_tag_pk` PRIMARY KEY(`favorite_pizza_id`,`topping_tag`)
);
--> statement-breakpoint
CREATE TABLE `favorite_pizzas` (
	`id` binary(16) NOT NULL,
	`user_id` binary(16) NOT NULL,
	`name` varchar(80) NOT NULL,
	`size_tag` varchar(64) NOT NULL,
	`crust_tag` varchar(64) NOT NULL,
	`sauce_tag` varchar(64) NOT NULL,
	CONSTRAINT `favorite_pizzas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `favorite_pizza_toppings` ADD CONSTRAINT `favorite_pizza_toppings_favorite_pizza_id_favorite_pizzas_id_fk` FOREIGN KEY (`favorite_pizza_id`) REFERENCES `favorite_pizzas`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `favorite_pizzas` ADD CONSTRAINT `favorite_pizzas_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `favorite_pizzas_user_id_idx` ON `favorite_pizzas` (`user_id`);