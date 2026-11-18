CREATE TABLE pain_modification_reviews (
 id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, coach_email TEXT NOT NULL,
 request_json TEXT NOT NULL, report_json TEXT NOT NULL, actor_id TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','approved','rejected','modified')),
 version INTEGER NOT NULL DEFAULT 1, decision_json TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX pain_modification_owner ON pain_modification_reviews(owner_id,created_at);
CREATE INDEX pain_modification_coach ON pain_modification_reviews(coach_email,created_at);
CREATE TABLE pain_modification_review_events (
 review_id TEXT NOT NULL REFERENCES pain_modification_reviews(id) ON DELETE CASCADE,
 version INTEGER NOT NULL, state TEXT NOT NULL, decision_json TEXT, created_at TEXT NOT NULL, actor_id TEXT NOT NULL,
 PRIMARY KEY(review_id,version)
);
CREATE TRIGGER pain_modification_created AFTER INSERT ON pain_modification_reviews BEGIN
 INSERT INTO pain_modification_review_events VALUES(NEW.id,NEW.version,NEW.state,NEW.decision_json,NEW.updated_at,NEW.actor_id);
END;
CREATE TRIGGER pain_modification_decided AFTER UPDATE ON pain_modification_reviews BEGIN
 INSERT INTO pain_modification_review_events VALUES(NEW.id,NEW.version,NEW.state,NEW.decision_json,NEW.updated_at,NEW.actor_id);
END;

