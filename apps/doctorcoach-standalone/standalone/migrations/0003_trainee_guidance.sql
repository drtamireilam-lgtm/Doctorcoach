-- Additive, local candidate only. Existing users stay NULL / unclassified.
-- Requires standalone 0002 and application 0059; never run a generic runner.
ALTER TABLE dc_managed_users ADD COLUMN guidance_mode TEXT
 CHECK(guidance_mode IN ('coached','independent','awaiting_assignment'));
CREATE TRIGGER dc_guidance_insert BEFORE INSERT ON dc_managed_users
WHEN (NEW.guidance_mode IS NOT NULL AND NEW.role IS NOT 'trainee')
 OR (NEW.guidance_mode='coached' AND (NEW.coach_id IS NULL OR NEW.approval<>'approved' OR NEW.status<>'active'))
 OR (NEW.guidance_mode IN ('independent','awaiting_assignment') AND NEW.coach_id IS NOT NULL)
BEGIN SELECT RAISE(ABORT,'Inconsistent trainee guidance'); END;
CREATE TRIGGER dc_guidance_update BEFORE UPDATE ON dc_managed_users
WHEN (NEW.guidance_mode IS NOT NULL AND NEW.role IS NOT 'trainee')
 OR (NEW.guidance_mode='coached' AND (NEW.coach_id IS NULL OR NEW.approval<>'approved' OR NEW.status<>'active'))
 OR (NEW.guidance_mode IN ('independent','awaiting_assignment') AND NEW.coach_id IS NOT NULL)
BEGIN SELECT RAISE(ABORT,'Inconsistent trainee guidance'); END;
