# Coach import review and remembered exercise mappings

Excel and text PDF parsing remains on the device. The new preview groups active rows by training day and section, displays validated ranges/units, unspecified weights, effort, tempo and notes, and flags invalid rows. A review checkbox is required to load the draft and resets whenever rows change. Publishing remains a separate program-editor action.

The coach explicitly saves a source exercise name to a library exercise. Only that name and exercise ID are stored, scoped to the signed-in coach; no file, client ID, prescription or historical performance is sent to this endpoint. Later imports offer the saved mapping for explicit use rather than selecting a variant automatically. Current source dosing is retained. Mappings may be revised or deleted with optimistic versions, and up to 250 are stored per coach.

The API authorizes active coaches and the configured physician owner, excludes Operations users, and rechecks author privileges within writes. Custom targets must be owned or published, checked again in SQL; definitions available only through a particular client's program cannot become reusable mappings. Data export and account deletion include the private mapping table. Migration: 0033_import_exercise_mappings.
