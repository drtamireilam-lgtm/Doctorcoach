# Research progress — 2026-10-17

Starting remote revision: `004e10628725b967d8f64aae1570050c7bbb0c76` (14 original tests).

Implemented one coherent offline reference/lab package: ROI candidate tracking and circle proposals; loss/ambiguity and accumulated camera-motion gates; timestamped concentric candidates and scaled vertical velocity; assumption bounds; personal RIR/RPE regression with session holdout; three-lift manual-evidence rule subset; opt-in practice cue state machine; local browser UI, report export and click-to-speak rehearsal. Added per-source provenance, local-only request checks, bounded temporary media processing and an independent annotation comparator.

Current verification: 57 Python tests and 36 generated-video benchmark cases pass, plus the Chromium workflow, JavaScript syntax and Python compilation. These results do not validate human tracking, real RIR, anatomical judgment or live audio. See VALIDATION.md for what was actually run and unresolved gates.

No active application files were changed, no private research videos were committed, no accounts/databases were accessed, and no merge, hosting or production deployment was performed. The new GitHub Actions workflow is for this feature branch only; its remote execution remains to be confirmed.

Next priority is independent real-bar annotation/reference validation, not adding an automatic Good Lift/RPE claim to the existing application. The local lab is usable for this manual review/calibration research without any integration.

## Interactive marker / correction follow-up

Added centre tap/drag, adjustable ROI, keyboard nudge, scrollable zoom, transport steps, overlay replay with loss pause and explicit re-anchoring. Backend accepts validated source frame/time starts, retains original timestamps, reports exact failure frames and expires previous jobs. Segment JSON preserves separate manual anchors and candidate tracks, never fills gaps or combines measurements. Source/re-anchoring clears scale and review. Only local research UI changed; no hosting or app integration.

Verified 57 Python tests, 36 synthetic benchmark cases and Chromium pointer/restart/export workflow plus touch emulation at 390px, keyboard nudge and zoom. Touch emulation is not real iPhone validation. Private uploaded videos were not committed or used as automated test fixtures. The earlier brief manual-ROI trial on three real clips lost the target in every clip; this interaction change does not solve or validate real-world tracking.
