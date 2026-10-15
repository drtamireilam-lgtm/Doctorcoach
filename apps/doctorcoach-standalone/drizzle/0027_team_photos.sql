CREATE TABLE `team_photos` (
 `member_id` text PRIMARY KEY NOT NULL,
 `object_key` text NOT NULL,
 `mime` text NOT NULL,
 `bytes` integer NOT NULL,
 `version` integer DEFAULT 1 NOT NULL,
 `updated_at` text NOT NULL,
 `updated_by` text NOT NULL
);
