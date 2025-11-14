CREATE TABLE `client_mappings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contactName` text,
	`contactEmail` varchar(320) NOT NULL,
	`discordChannelName` text,
	`discordChannelId` varchar(64),
	`accountManager` text,
	`projectOwner` text,
	`clientName` text,
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	`uploadedBy` int,
	CONSTRAINT `client_mappings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `client_mappings` ADD CONSTRAINT `client_mappings_uploadedBy_users_id_fk` FOREIGN KEY (`uploadedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;