-- Additive provenance only; existing links remain independent.
ALTER TABLE care_connections ADD COLUMN management_derived INTEGER NOT NULL DEFAULT 0 CHECK(management_derived IN (0,1));

-- Existing independently consented invite/onboarding writes always set scope.
-- Management assignment writes only active, so they do not promote themselves.
CREATE TRIGGER care_connection_independent_consent AFTER UPDATE OF scope ON care_connections
WHEN NEW.management_derived=1 AND NEW.active=1 BEGIN
 UPDATE care_connections SET management_derived=0 WHERE id=NEW.id;
END;
