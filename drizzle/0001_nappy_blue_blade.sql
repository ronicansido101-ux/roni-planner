CREATE TABLE `plannerStates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`data` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `plannerStates_id` PRIMARY KEY(`id`),
	CONSTRAINT `plannerStates_userId_unique` UNIQUE(`userId`)
);
