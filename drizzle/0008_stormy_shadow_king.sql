CREATE TABLE `a2p_status` (
	`id` int AUTO_INCREMENT NOT NULL,
	`locationId` varchar(64) NOT NULL,
	`checkedAt` timestamp NOT NULL,
	`brandStatus` varchar(64) NOT NULL,
	`campaignStatus` varchar(64) NOT NULL,
	`sourceUrl` text NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `a2p_status_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ghl_locations` (
	`id` varchar(64) NOT NULL,
	`name` text NOT NULL,
	`companyName` text,
	`tags` text,
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ghl_locations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `a2p_status` ADD CONSTRAINT `a2p_status_locationId_ghl_locations_id_fk` FOREIGN KEY (`locationId`) REFERENCES `ghl_locations`(`id`) ON DELETE cascade ON UPDATE no action;