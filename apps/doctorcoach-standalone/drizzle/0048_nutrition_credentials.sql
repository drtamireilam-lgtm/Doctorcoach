CREATE TABLE `nutrition_credentials` (
 `email` text PRIMARY KEY NOT NULL,
 `qualification` text NOT NULL,
 `reference` text NOT NULL,
 `issuer` text NOT NULL,
 `active` integer NOT NULL,
 `verified_by` text NOT NULL,
 `verified_at` text NOT NULL,
 `version` integer DEFAULT 1 NOT NULL
);
