# Validation record and readiness gaps

Date: 2026-10-17. Scope: the isolated `feature/vbt-engine` reference/lab implementation. Historical active-application test counts do not describe this branch's VBT accuracy.

## Executed in this development run

| Check | Actual result | What it establishes |
|---|---|---|
| Original engine baseline | 14 passed | Existing mathematical/quality gates work on their fixtures |
| Python research suite | 57 passed, 0 failed | Numeric edge cases, track loss/ambiguity, camera drift, timestamps, segmentation, personal-calibration scope and held-out failure, checklist chronology, cue ordering/freshness/opt-in, local HTTP access and synthetic upload pipeline |
| Encoded-video benchmark | 36 passed, 0 failed | Generated textured patch on generated background at 24/30/60 FPS; clean localization/velocity and rejection of occlusion, duplicate object and camera movement |
| Chromium desktop workflow | Passed | Synthetic WebM upload/decode, ROI tracking, withheld measurement, manual scale/review, report download, training mode, explicit speech dispatch (mocked), unknown checklist, personal-calibration input, source reset and 390/1280px widths |
| JavaScript syntax and Python compilation | Passed | Parse/compile checks, not device behavior |

All files used by the video benchmark are generated in temporary directories and removed. Three scenario labels (bench/squat/deadlift) are **not three classes of real human movement**: each uses a generated translating patch. This cannot measure generalization, real bar identity, physiological RIR, competition technique or anatomical landmark accuracy.

Chromium uses generated WebM because this Linux headless build did not decode the first H.264 fixture. This is an explicit codec/device coverage gap, not proof that Safari/MOV/H.264 works. Speech is intercepted to check text dispatch and opt-in only; audible timing/voice quality is untested. The CI workflow was added but a successful GitHub Actions run has not yet been observed.

## Defects found and corrected here

- NaN/infinite input and overflow could escape the old scalar/track checks. They now reject without emitting velocity.
- A smooth end-to-end displacement could conceal reversal or a temporal hole. Both reject the candidate interval.
- Slow camera drift could remain under a per-frame threshold. The background-flow check now accumulates drift; featureless backgrounds cannot confirm stability.
- Commands could be considered after an out-of-order phase. Practice cues now latch off after early movement, stale frames or uncertain evidence, and finish requires an observed ascent.
- Partial missing body evidence must not hide a separately observed command violation. Both are retained.
- UI overlay geometry was corrected to match the source aspect ratio and preserve native video controls. New sources invalidate previous results and review checkboxes.

## Required before product readiness

1. **Consented, independently annotated real footage:** diverse lifters, lifts/variations, clothes, plates, racks, cameras, lighting, angles, occlusions and frame rates. Annotate true object identity, source timestamps, phase boundaries and camera motion. Freeze a held-out set before model tuning. Keep source videos private and record source hashes.
2. **Vision:** train/evaluate a detector and temporal association, foreground/background identity swaps, re-acquisition and explicit uncertain segments. Compare against human ground truth; report miss/swap rates and localization error per subgroup. Template tracking is a conservative baseline, not the finished detector.
3. **Velocity:** compare with a validated reference device and independent distance/time calibration; quantify systematic bias and limits of agreement. Investigate perspective, rolling shutter, rotation, variable-frame-rate timestamps and actual MOV/H.264/HEVC decoding. Current bounds are assumption bounds, not validated confidence intervals.
4. **Personal RIR:** set-level labels (last rep) and exact protocol/intent, multiple sessions per athlete. RPE 7–8 recalled for a whole video is insufficient ground truth. Prefer independently observed repetitions-to-task-failure when ethically and practically appropriate; no request to lift to failure is made by this tool. Prospectively assess error/calibration on new sessions. The fitted linear relationship is research-only.
5. **Judge:** a qualified referee must review rule coverage and exceptions. Add validated multi-view/keypoint/body-contact observations; report per-criterion unknown/error rates. Full-lift decisions cannot be inferred from bar speed alone. Checklist pass is not official Good Lift.
6. **Live cues:** source-to-sound latency, jitter, frame loss, supported devices, deliberate user arming and coach-controlled abort must be assessed before any automated command during a lift. Current UI speaks only on explicit button clicks. The backend observation state machine is not connected to a live vision model.
7. **Product and privacy:** actual Windows/macOS/iOS/Android acceptance tests, accessibility testing, isolated consent/retention rules, packaging, threat assessment for untrusted media and explicit product approval before any application integration. No production or pilot deployment is authorized by this research branch.

No release-ready flag is set by these synthetic tests. All new reports retain `validated: false`.

## Interactive annotation follow-up

Python suite now has 57 passing tests. New checks cover exact frame restart, original timestamps, time-based start, invalid start values, failure-frame reporting, separate HTTP jobs and reset measurement gates. Chromium integration additionally exercises centre click, loss-paused replay, correction at the failed frame, restarted tracking, two-segment annotation export, zoom, touch emulation and keyboard adjustment. Desktop and 390px emulation passed; Safari/physical touch devices remain untested. Sequential decoding avoids codec keyframe-seek offsets; browser transport ±1/30 is explicitly approximate. Restarted segments are not a complete validated repetition and must not be stitched through lost intervals.
