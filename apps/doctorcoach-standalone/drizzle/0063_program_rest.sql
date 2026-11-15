-- Additive; legacy rows stay unspecified and session JSON is untouched.
ALTER TABLE program_items ADD COLUMN rest_seconds INTEGER CHECK(rest_seconds IS NULL OR (rest_seconds BETWEEN 0 AND 1800 AND rest_seconds = CAST(rest_seconds AS INTEGER)));
