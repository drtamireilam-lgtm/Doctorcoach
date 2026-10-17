# Implementation map

| Module | Implemented | Boundary |
|---|---|---|
| `vision.py` | Circle proposals; first-frame ROI, fixed-reference template matching, runner-up ambiguity, background LK forward/backward flow, cumulative camera drift, fail-stop on loss | No trained bar detector; circles include rack wheels; no recovery without explicit new selection |
| `motion.py` | Actual decoded timestamps, gap/reversal gates, upward bout segmentation, same-plane scale, preliminary vertical velocity and assumption bounds | No interpolation through occlusion, no 3D correction, no verified full-repetition count |
| `effort.py` | Per-athlete/lift/protocol monotonic regression, leave-one-session-out error checks, ranges, no extrapolation | No universal speed-to-RIR claim; self-report is not true failure ground truth |
| `judge.py` | Three-lift manual-evidence subset, command/event chronology, unknown/violation outcomes | Non-exhaustive checklist, not automatic body pose analysis or official judging |
| `cues.py` | Fresh reviewed observation stream, ordered practice commands, stability debounce, loss latch, opt-in | Not connected to live camera; no autonomous cues from unverified vision |
| `pipeline.py` | Common offline report, whole-track quality gate, withheld default RPE | Never marks a result as validated |
| `validation.py` | Independent timestamp/position annotation comparison | Metrics require actual bar ground truth, not the predicted trajectory itself |
| `tools/vbt-lab/` | Loopback UI/server, local temporary upload, overlay review, calibration, manual evidence, click-to-speak, JSON export | No active-app imports, accounts, cloud resources or public hosting |

## Rules source and limits

Source reviewed 2026-10-17: [IPF Technical Rulebook, effective 2026-03-01, v3](https://www.powerlifting.sport/fileadmin/ipf/data/rules/technical-rules/english/2026_IPF_Technical_Rulebook__effective_01_March_2026__v3.pdf), sections 4.1–4.3. This is a partial software checklist; equipment, grip, spotter contact, motion exceptions and all federation-specific details need referee review. A motionless bench position precedes Press; **there is no prescribed fixed pause duration**. The cue engine's 0.5-second default is a configurable research debounce, not that rule. Deadlift shoulder-settle exceptions must be assessed by a human; the candidate-motion gate may reject such a segment rather than assign a no-lift.

## Operational safeguards

- The server binds only `127.0.0.1`; exact Host, Origin and a per-run random request token are required for POSTs. No CORS access, cache or arbitrary filesystem routes. A new tracked source invalidates the preceding job and attestation.
- No source contents, filenames or raw data are logged. Reports use source SHA-256/ROI provenance in the local UI and preserve `validated: false`. Reports and calibration remain private research data even with pseudonyms.
- File sizes, frame counts, resolution, input ranges and timestamps are bounded. Failed or ambiguous tracking cannot recover silently to a different object.
- No model trained on the videos from the earlier conversation was imported. Earlier background-following tracks were rejected; private historical prototypes remain separate.

## Not implemented

A trained object detector; robust perspective/rotation/lens correction; human-keypoint/occlusion models; automatic full IPF verdicts; validated live cues; load/equipment-specific physiological RIR validation; mobile native capture; production persistence/integration. Do not replace these missing pieces with claimed accuracy.

## Guarded appearance / feature-flow tracking

The tracker keeps the original ROI template. Appearance scores below 0.85 but at least 0.65 are accepted as **overlay candidates only** when forward/backward optical flow within the old ROI agrees with the template displacement: >=8 points, >=70% valid, >=80% displacement consensus, spatial spread >=8px, forward/backward error <0.75px and displacement agreement <=2.5px. Ambiguity and camera motion still stop the track; the template is never adapted into the background. The 0.65 floor applies to short-term flow support; the newer fixed-reference path additionally requires its own warped original-patch correlation >=0.8 as described below. Raw confidence is not inflated. Any flow-assisted segment suppresses all metric velocity output in the CLI and HTTP analysis, even after manual review/scale. This improves annotation continuity, not validated metrology.

## Local proposal selector

`selection.py` performs bounded geometry/texture ROI proposals and full-rate candidate-track ranking. It uses the same unchanged v3 tracker as the final run, not a downsampled temporal proxy. It requires stable observable background, nearly complete tested-window survival and >=8px image motion, avoiding static-rack preference from track longevity alone. Appearance/rank scores are not object-class probabilities. Endpoint `/api/suggest` shares local consent/origin/token/size/serialization protections, creates no accepted analysis job and expires earlier jobs. User choice is required before a new track. `selection_method=assisted-review` is recorded and gates off metric velocity. Selection/anchor/end changes clear stale UI proposals. Lock ownership is released before the completed response is exposed, avoiding a spurious 409 on the next sequential request.
