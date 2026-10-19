# Custom coach exercises

Coaches and the configured physician-owner can create immutable exercise definitions at `/api/exercises`. Definitions start private. The creator can request publication; only the configured physician-owner in an active clinician role can approve or reject it. Staff role and active status are checked again within writes. No caller-supplied role or definition snapshot grants access.

The creation controls appear in the exercise library and the client program builder. Unmatched Excel/PDF import rows offer the same creation control, prefilled with the source name. Definitions include bilingual names, aliases, equipment, group, optional family, instructions, measurement unit, and an optional HTTPS YouTube/Vimeo link. Built-in families and custom family labels are searchable filters.

Assignment and draft writes resolve custom IDs from the server catalog: creator-owned definitions, published definitions, or definitions already assigned within the same authorized client file. The server ignores caller-provided definition metadata. An immutable definition snapshot travels with the assigned plan and workout history. New custom definitions are new records rather than edits to existing instructions.

Published definitions work with independent plans. Adding from the library resolves defaults on the server so timed exercises keep their unit. Private definitions remain available to their assigned trainee through the program snapshot. Workout playback instructions and optional external video links are shown in the plan, active workout and history. Review-video uploads support assigned custom exercises; public demonstration uploads require a published definition.

Definitions belonging to an author or reviewer are protected from the existing automated trainee account-deletion workflow, just like other authored team records. Own definitions are included in account exports. Creation is limited to 100 definitions per author; catalog listings are bounded to 600 records.

Migration: `0032_custom_exercises.sql`. Integration tests cover ownership, forged snapshots and IDs, moderation/version conflicts, live role changes, draft/assignment/workout/history, independent timing defaults, import aliases and video visibility. Browser QA requires the Sites control-browser capability, which was unavailable in this session.
