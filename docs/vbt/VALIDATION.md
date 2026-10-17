# Validation record and readiness gaps

Date: 2026-10-17. Scope: the isolated `feature/vbt-engine` reference/lab implementation. Historical active-application test counts do not describe this branch's VBT accuracy.

## Executed in this development run

| Check | Actual result | What it establishes |
|---|---|---|
| Original engine baseline | 14 passed | Existing mathematical/quality gates work on their fixtures |
| Python research suite | 59 passed, 0 failed | Numeric edge cases, track loss/ambiguity, camera drift, timestamps, segmentation, personal-calibration scope and held-out failure, checklist chronology, cue ordering/freshness/opt-in, local HTTP access and synthetic upload pipeline |
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

Python suite now has 59 passing tests. New checks cover exact frame restart, original timestamps, time-based start, invalid start values, failure-frame reporting, separate HTTP jobs and reset measurement gates. Chromium integration additionally exercises centre click, loss-paused replay, correction at the failed frame, restarted tracking, two-segment annotation export, zoom, touch emulation and keyboard adjustment. Desktop and 390px emulation passed; Safari/physical touch devices remain untested. Sequential decoding avoids codec keyframe-seek offsets; browser transport ±1/30 is explicitly approximate. Restarted segments are not a complete validated repetition and must not be stitched through lost intervals.

## Feature-flow follow-up after user annotation export

59 Python tests, the 36-case synthetic benchmark and Chromium workflow pass. New tests exercise small rotation with weak appearance plus valid flow, retained raw low confidence, refusal without flow consensus, latched failure and HTTP velocity suppression for all flow-assisted tracks. The private user export and video were only used locally and are not committed. With the same first manual ROI/start on that one bench source, the baseline stopped at source time ~3.70s and the guarded flow version at ~8.26s (246 candidate samples, 80 flow-supported frames). A restarted ROI went from 20 to 30 candidate frames and still failed. These are development-source observations, not held-out accuracy evidence. Five overlay frames were visually spot-checked; the entire track has not been independently annotated. Full-clip tracking remains unresolved. No velocity, RIR or judging validation is claimed.

## Reference-feature / end-bound follow-up

62 Python tests, 36 generated-video cases and Chromium workflow passed locally. Added checks for fixed-identity rotation support, permanent loss without reseeding, refusal to follow a distant copy, explicit end timestamp validation and preservation of failures before that end. Browser check includes a bounded restarted segment and clearing its bound. Existing ambiguity, occlusion and camera-drift gates continue to pass.

The second private development export used a different anchor (frame 0, ROI y=314 rather than frame 2/y=316). Its old failure at frame 206 (~6.86s) is not directly comparable with the previous export. Using this exact new anchor locally, reference corroboration reaches frame 248 (~8.26s), then still stops. Adjacent ROI probes reach about 8.56–8.66s but are development selection experiments, not independent ground truth. Source frames around the later stop show the bar being moved toward the right edge/rack, with the selected patch near the image boundary; this is an observation, not proof of the sole failure cause. The original patch and fixed seed identities are preserved. Neither private video nor annotation exports are committed. Full independent per-frame annotation and device testing remain outstanding.

## Assisted selection follow-up

Local Python suite: 70 tests. Added generated-video tests for moving patches, refusal of static/occluded/panning scenes, local proposal bounds, timestamps and start/end validation, HTTP selection-to-track flow, analysis-job expiry, metric suppression despite scale/review, and immediate sequential requests. The 36-case tracker benchmark remains separate from selection quality. Chromium integration covers assistance, explicit choice, full tracking, review-only analysis/export and the existing marker/correction/mobile-width flow.

Local development runs on the three previously used private videos returned first suggestions that completed the selected full-rate intervals: bench 8s/241 samples; deadlift 5s/151; squat 6.037s/182. These are selected development sources, not independent validation. No suggestion-generated track has yet received new live user review in this version. No real velocity reference, independent per-frame labels, physical iPhone/Safari test or generalization evidence was added. Moving distractors can still be suggested; all assisted outputs remain non-metric review candidates. Private videos/annotation exports are not committed.
