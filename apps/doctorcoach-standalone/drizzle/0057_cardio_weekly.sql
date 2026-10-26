CREATE TABLE activity_cardio_weekly_goals (
 owner_id TEXT NOT NULL, week TEXT NOT NULL,
 cardio_sessions INTEGER CHECK(cardio_sessions IS NULL OR cardio_sessions BETWEEN 0 AND 21),
 cardio_minutes REAL CHECK(cardio_minutes IS NULL OR cardio_minutes BETWEEN 0 AND 10080),
 version INTEGER NOT NULL DEFAULT 1,
 author_id TEXT NOT NULL, author_role TEXT NOT NULL CHECK(author_role IN ('owner','coach')),
 effective_at TEXT NOT NULL,
 PRIMARY KEY(owner_id,week)
);
