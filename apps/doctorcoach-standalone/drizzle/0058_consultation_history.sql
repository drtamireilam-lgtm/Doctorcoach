-- Append-only transition facts; no patient names, clinical text or appointment foreign key.
CREATE TABLE appointment_status_history (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 appointment_id TEXT NOT NULL,
 from_state TEXT,
 to_state TEXT NOT NULL,
 version INTEGER NOT NULL,
 changed_at TEXT NOT NULL
);
CREATE INDEX appointment_history_record ON appointment_status_history(appointment_id,version);
CREATE TRIGGER appointment_status_insert AFTER INSERT ON care_appointments BEGIN
 INSERT INTO appointment_status_history(appointment_id,from_state,to_state,version,changed_at)
 VALUES(NEW.id,NULL,NEW.state,NEW.version,NEW.created_at);
END;
CREATE TRIGGER appointment_status_update AFTER UPDATE OF state ON care_appointments
WHEN NEW.state<>OLD.state BEGIN
 INSERT INTO appointment_status_history(appointment_id,from_state,to_state,version,changed_at)
 VALUES(NEW.id,OLD.state,NEW.state,NEW.version,NEW.updated_at);
END;
