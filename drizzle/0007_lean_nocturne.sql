CREATE TABLE `activity_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`alertType` enum('zero_messages','volume_spike') NOT NULL,
	`threshold` int NOT NULL,
	`isActive` int NOT NULL DEFAULT 1,
	`channelFilter` text,
	`lastTriggered` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `activity_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `discord_channels` ADD `tags` text;