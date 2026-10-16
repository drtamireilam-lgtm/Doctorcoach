# Research progress — 2026-10-17

Starting remote revision: `004e10628725b967d8f64aae1570050c7bbb0c76` (14 original tests).

Implemented one coherent offline reference/lab package: ROI candidate tracking and circle proposals; loss/ambiguity and accumulated camera-motion gates; timestamped concentric candidates and scaled vertical velocity; assumption bounds; personal RIR/RPE regression with session holdout; three-lift manual-evidence rule subset; opt-in practice cue state machine; local browser UI, report export and click-to-speak rehearsal. Added per-source provenance, local-only request checks, bounded temporary media processing and an independent annotation comparator.

Current verification: 55 Python tests and 36 generated-video benchmark cases pass, plus the Chromium workflow, JavaScript syntax and Python compilation. These results do not validate human tracking, real RIR, anatomical judgment or live audio. See VALIDATION.md for what was actually run and unresolved gates.

No active application files were changed, no private research videos were committed, no accounts/databases were accessed, and no merge, hosting or production deployment was performed. The new GitHub Actions workflow is for this feature branch only; its remote execution remains to be confirmed.

Next priority is independent real-bar annotation/reference validation, not adding an automatic Good Lift/RPE claim to the existing application. The local lab is usable for this manual review/calibration research without any integration.
