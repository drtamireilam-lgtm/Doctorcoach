# Coach-controlled next-workout progression — 2026-10-09

The coach revision editor now connects completed workout evidence to the next
program prescription. Each exercise offers a proposal from the latest completed
workout of the same assigned program and workout-day slot, using the existing
nextLoad rule. Older programs/different days never silently supply a suggestion.
Incomplete or substituted latest-day work does not fall back to an older workout.
Changed sets/reps/unit/effort targets require a new coach decision. Active sessions,
unsupported effort, variable performed loads and pain remain gated.

The coach can transfer a proposal into the editor, manually adjust starting load,
save a private draft, and review every day before publishing. No trainee self-approval
is introduced. Existing server role, active-workout, revision-conflict and assignment
guards remain authoritative. Starting the next workout uses the newly approved load;
previous session snapshots are preserved. Source readiness/pain can be inspected
alongside the proposal. This is decision support, not automatic clinical clearance.

No schema change. Readiness does not introduce automatic sleep/energy thresholds.
The integration test exposed an old normalization rule that reset every coach-assigned
starting weight to zero. The assignment/review/draft parser now retains the validated
weight, so the coach-approved load actually reaches the next session.
Independent self-mode automatic progression remains outside this coach-focused batch.
Checks include eligibility, day/version matching, incomplete latest sessions,
pain, RIR equivalence, and an integration test through assignment, execution,
completion, coach revision and the next session. Browser/mobile QA remains unavailable.

Next: the seven-area trainee navigation described in DEVELOPMENT_STATUS.md.
