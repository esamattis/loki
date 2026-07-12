ALTER TABLE `jumps` ADD `jump_date` text;
UPDATE `jumps` SET `jump_date` = date('now') WHERE `jump_date` IS NULL;