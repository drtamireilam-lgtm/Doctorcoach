CREATE TABLE IF NOT EXISTS push_devices (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL,
 email TEXT NOT NULL,
 endpoint TEXT NOT NULL,
 fingerprint TEXT NOT NULL DEFAULT '',
 claimed_at TEXT,
 claim_id TEXT,
 last_sent_at TEXT,
 created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS push_devices_owner ON push_devices(user_id);
