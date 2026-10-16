# Research progress — 2026-10-17

Starting remote revision: `004e10628725b967d8f64aae1570050c7bbb0c76` (14 original tests).

Implemented one coherent offline reference/lab package: ROI candidate tracking and circle proposals; loss/ambiguity and accumulated camera-motion gates; timestamped concentric candidates and scaled vertical velocity; assumption bounds; personal RIR/RPE regression with session holdout; three-lift manual-evidence rule subset; opt-in practice cue state machine; local browser UI, report export and click-to-speak rehearsal. Added per-source provenance, local-only request checks, bounded temporary media processing and an independent annotation comparator.

Current verification: 59 Python tests and 36 generated-video benchmark cases pass, plus the Chromium workflow, JavaScript syntax and Python compilation. These results do not validate human tracking, real RIR, anatomical judgment or live audio. See VALIDATION.md for what was actually run and unresolved gates.

No active application files were changed, no private research videos were committed, no accounts/databases were accessed, and no merge, hosting or production deployment was performed. The new GitHub Actions workflow is for this feature branch only; its remote execution remains to be confirmed.

Next priority is independent real-bar annotation/reference validation, not adding an automatic Good Lift/RPE claim to the existing application. The local lab is usable for this manual review/calibration research without any integration.

## Interactive marker / correction follow-up

Added centre tap/drag, adjustable ROI, keyboard nudge, scrollable zoom, transport steps, overlay replay with loss pause and explicit re-anchoring. Backend accepts validated source frame/time starts, retains original timestamps, reports exact failure frames and expires previous jobs. Segment JSON preserves separate manual anchors and candidate tracks, never fills gaps or combines measurements. Source/re-anchoring clears scale and review. Only local research UI changed; no hosting or app integration.

Verified 59 Python tests, 36 synthetic benchmark cases and Chromium pointer/restart/export workflow plus touch emulation at 390px, keyboard nudge and zoom. Touch emulation is not real iPhone validation. Private uploaded videos were not committed or used as automated test fixtures. The earlier brief manual-ROI trial on three real clips lost the target in every clip; this interaction change does not solve or validate real-world tracking.

## Guarded flow follow-up

Diagnosed user-exported stops as loss of original-template similarity, not the camera gate. Added feature-flow corroboration for bounded weak appearance; retained original template, ambiguity/camera gates and raw confidence. CLI/server suppress velocity for every flow-assisted segment. Local development clip showed a longer first candidate track, not a full-clip success or validated measurement. Full tracking and independent annotation remain next priorities. No private export/video is in Git.

## Second user export: fixed reference features and explicit end bound

Added fixed-identity feature corroboration with RANSAC similarity and original-patch warp checks, without reseeding/adapting object identity. Added image-edge marker guidance and an optional source-time end bound to exclude post-lift footage intentionally; bounds are recorded and never bridge a failure. 62 Python tests, 36 synthetic cases and Chromium flow passed. Locally reproduced the exact new private anchor and extended its candidate track from ~6.86s to ~8.26s, still not full-video success. This development source is not held out; assisted tracks remain non-metric and unvalidated. No active app/deployment changes.

## User visual review and deadlift anchor sensitivity

The user confirmed that the bar overlay stayed on the target in the selected eight-second bench segment. Its export had 241 samples, an explicit end bound and no reported failure; the mid-source playback stop was the requested bound, not track loss. This is subjective overlay review, not independent metric validation.

A subsequent private deadlift export (end bound five seconds) failed at source time ~3.93s. Local inspection found original feature support and appearance deteriorating for the chosen protruding-tip patch. In the same released v3 code, a hub/junction patch completed the five-second interval with 151 candidate samples and no failure. Four overlay frames were spot-checked on the visible junction. No entire-track ground-truth annotation or velocity validation was performed, and user review of this alternative anchor is pending. The tracker remains sensitive to the selected image region; automatic target/ROI selection remains unresolved. No algorithm change or deployment is included in this follow-up, and private media/exports remain outside Git.

## Deadlift export confirmation and squat development probe

The next user deadlift export contained both the failed tip-ROI run and the successful junction-ROI run: the latter completed the selected five-second interval with 151 samples and no reported failure. The user confirmed the overlay worked. This remains visual review, not independent velocity validation.

A squat export failed around 1.20s for a 40px ROI including the protruding end and part of the rack. In the same released code a smaller junction ROI completed the selected 6.037-second interval with 182 samples and no reported failure. Four overlay frames including descent/ascent were spot-checked; user review is pending. This was a local anchor-selection development experiment, not a held-out robustness test. Sensitivity to distractors and patch selection remains a product blocker: selecting numeric coordinates per source is a diagnostic aid, not a production-ready flow. No private files were committed, no code thresholds changed and no deployment occurred.
