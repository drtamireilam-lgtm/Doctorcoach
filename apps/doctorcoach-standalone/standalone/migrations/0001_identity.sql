-- Synthetic staging schema only. NOT a production migration.
-- No clinical, email, role, consent or payment information is stored here.
CREATE TABLE dc_identity_principals (
  id TEXT PRIMARY KEY,
  state TEXT NOT NULL CHECK(state IN ('active','blocked','deleted')),
  origin_issuer TEXT NOT NULL,
  origin_subject TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(origin_issuer,origin_subject)
);
CREATE TABLE dc_identity_aliases (
  issuer TEXT NOT NULL,
  subject TEXT NOT NULL,
  principal_id TEXT NOT NULL REFERENCES dc_identity_principals(id),
  created_at INTEGER NOT NULL,
  PRIMARY KEY(issuer,subject)
);
CREATE TABLE dc_identity_challenges (
  id TEXT PRIMARY KEY,
  ticket_hash TEXT NOT NULL UNIQUE,
  principal_id TEXT NOT NULL REFERENCES dc_identity_principals(id),
  source_subject TEXT NOT NULL,
  target_issuer TEXT NOT NULL,
  target_subject TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  consumed_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE TABLE dc_identity_link_receipts (
  challenge_id TEXT PRIMARY KEY REFERENCES dc_identity_challenges(id),
  principal_id TEXT NOT NULL REFERENCES dc_identity_principals(id),
  operation_id TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);
-- Additive standalone schema, applied only to the isolated D1 target.
CREATE TABLE dc_identity_details(principal_id TEXT PRIMARY KEY REFERENCES dc_identity_principals(id),email TEXT NOT NULL,display_name TEXT NOT NULL,legacy INTEGER NOT NULL DEFAULT 0 CHECK(legacy IN(0,1)));
CREATE TABLE dc_auth_sessions(id_hash TEXT PRIMARY KEY,issuer TEXT NOT NULL,subject TEXT NOT NULL,email TEXT NOT NULL,tokens_cipher TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL,last_seen INTEGER NOT NULL,expires_at INTEGER NOT NULL,refreshing TEXT,revoked_at INTEGER);
CREATE INDEX dc_auth_subject ON dc_auth_sessions(issuer,subject);
CREATE TABLE dc_auth_challenges(id_hash TEXT PRIMARY KEY,email TEXT NOT NULL,expires_at INTEGER NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,consumed_at INTEGER);
CREATE TABLE dc_auth_limits(id TEXT PRIMARY KEY,window_start INTEGER NOT NULL,count INTEGER NOT NULL);
-- Imported, verified old-account metadata. Never an email-based alias table.
CREATE TABLE dc_reserved_emails(email TEXT PRIMARY KEY);
CREATE TABLE dc_legacy_link_receipts(nonce TEXT PRIMARY KEY,subject TEXT NOT NULL,principal_id TEXT NOT NULL,created_at INTEGER NOT NULL);
