CREATE TABLE `deliveries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientName` varchar(255) NOT NULL,
	`originAddress` text NOT NULL,
	`originLat` varchar(50),
	`originLng` varchar(50),
	`destinationAddress` text NOT NULL,
	`destinationLat` varchar(50),
	`destinationLng` varchar(50),
	`driverId` int,
	`status` enum('pendente','em_rota','entregue','cancelado') NOT NULL DEFAULT 'pendente',
	`scheduledAt` timestamp,
	`notes` text,
	`distance` varchar(50),
	`estimatedTime` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `deliveries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `drivers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320),
	`phone` varchar(20),
	`vehicle` varchar(255),
	`status` enum('available','busy','offline') NOT NULL DEFAULT 'offline',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `drivers_id` PRIMARY KEY(`id`)
);
