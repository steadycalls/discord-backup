CREATE TABLE `discord_attachments` (
	`id` varchar(64) NOT NULL,
	`messageId` varchar(64) NOT NULL,
	`url` text NOT NULL,
	`filename` text,
	`contentType` varchar(128),
	`sizeBytes` int,
	`insertedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `discord_attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `discord_channels` (
	`id` varchar(64) NOT NULL,
	`guildId` varchar(64) NOT NULL,
	`name` text NOT NULL,
	`type` varchar(32) NOT NULL,
	`createdAt` timestamp NOT NULL,
	`insertedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `discord_channels_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `discord_guilds` (
	`id` varchar(64) NOT NULL,
	`name` text NOT NULL,
	`iconUrl` text,
	`createdAt` timestamp NOT NULL,
	`insertedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `discord_guilds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `discord_messages` (
	`id` varchar(64) NOT NULL,
	`channelId` varchar(64) NOT NULL,
	`guildId` varchar(64) NOT NULL,
	`authorId` varchar(64) NOT NULL,
	`content` text,
	`createdAt` timestamp NOT NULL,
	`editedAt` timestamp,
	`isPinned` int NOT NULL DEFAULT 0,
	`isTts` int NOT NULL DEFAULT 0,
	`rawJson` text,
	`insertedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `discord_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `discord_users` (
	`id` varchar(64) NOT NULL,
	`username` text NOT NULL,
	`discriminator` varchar(16),
	`globalName` text,
	`bot` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL,
	`insertedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `discord_users_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `webhook_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`webhookId` int NOT NULL,
	`eventType` varchar(32) NOT NULL,
	`messageId` varchar(64),
	`statusCode` int,
	`success` int NOT NULL,
	`errorMessage` text,
	`deliveredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `webhook_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `webhooks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`url` text NOT NULL,
	`eventType` enum('message_insert','message_update','message_delete','all') NOT NULL,
	`isActive` int NOT NULL DEFAULT 1,
	`guildFilter` varchar(64),
	`channelFilter` varchar(64),
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `webhooks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `discord_attachments` ADD CONSTRAINT `discord_attachments_messageId_discord_messages_id_fk` FOREIGN KEY (`messageId`) REFERENCES `discord_messages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `discord_channels` ADD CONSTRAINT `discord_channels_guildId_discord_guilds_id_fk` FOREIGN KEY (`guildId`) REFERENCES `discord_guilds`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `discord_messages` ADD CONSTRAINT `discord_messages_channelId_discord_channels_id_fk` FOREIGN KEY (`channelId`) REFERENCES `discord_channels`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `discord_messages` ADD CONSTRAINT `discord_messages_guildId_discord_guilds_id_fk` FOREIGN KEY (`guildId`) REFERENCES `discord_guilds`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `discord_messages` ADD CONSTRAINT `discord_messages_authorId_discord_users_id_fk` FOREIGN KEY (`authorId`) REFERENCES `discord_users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `webhook_logs` ADD CONSTRAINT `webhook_logs_webhookId_webhooks_id_fk` FOREIGN KEY (`webhookId`) REFERENCES `webhooks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `webhooks` ADD CONSTRAINT `webhooks_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;