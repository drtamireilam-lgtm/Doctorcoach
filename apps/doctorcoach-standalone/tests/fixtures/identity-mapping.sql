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
