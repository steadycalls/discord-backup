ALTER TABLE `meetings` ADD `sessionId` varchar(64);--> statement-breakpoint
ALTER TABLE `meetings` ADD `topics` text;--> statement-breakpoint
ALTER TABLE `meetings` ADD `keyQuestions` text;--> statement-breakpoint
ALTER TABLE `meetings` ADD `chapters` text;--> statement-breakpoint
ALTER TABLE `meetings` ADD `matchedChannelId` varchar(64);