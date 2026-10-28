-- Additive delivery evidence only; no historical event is invented or backfilled.
ALTER TABLE google_calendar_sync ADD COLUMN last_attempt_at TEXT;
ALTER TABLE google_calendar_sync ADD COLUMN last_synced_at TEXT;
ALTER TABLE google_calendar_sync ADD COLUMN last_error_code TEXT NOT NULL DEFAULT '';
ALTER TABLE google_calendar_sync ADD COLUMN time_zone TEXT NOT NULL DEFAULT 'Asia/Jerusalem';
