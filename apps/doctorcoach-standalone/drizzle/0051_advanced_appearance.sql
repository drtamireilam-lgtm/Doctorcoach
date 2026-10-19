-- Additive only: existing owners, modes, palettes, versions and guard triggers remain intact.
ALTER TABLE appearance_preferences ADD COLUMN custom_json text;
