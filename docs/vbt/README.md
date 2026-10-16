# DoctorCoach VBT / IPF practice research

Branch: `feature/vbt-engine`. This module and its local lab are **not imported by the active application**. There is no deployment, live billing, cloud upload or access to DoctorCoach accounts/databases. No private videos or credentials belong in Git.

## Run in an isolated Python environment

Python 3.12 recommended. From the repository root on Windows PowerShell:

```powershell
py -3 -m venv .venv-vbt
.\.venv-vbt\Scripts\python.exe -m pip install -r requirements-vbt.txt
$env:PYTHONPATH = "src"
.\.venv-vbt\Scripts\python.exe -m pytest -q tests/vbt
.\.venv-vbt\Scripts\python.exe tools/vbt-lab/server.py
```

Open `http://127.0.0.1:8765` on **that same computer**. This is a local research UI, not the staging or production application. Do not expose the server to a public network. Stop with Ctrl+C. The HTTP server has no persistent user accounts; use a trusted local computer. Any person with access to that computer/browser can access its research session.

On Linux/macOS use `python -m venv .venv-vbt` and `.venv-vbt/bin/python` instead. FFmpeg and Playwright are needed only for the optional Chromium browser check, not the lab server.

## Workflow

1. Choose a consented video, maximum 30 MiB and 60 seconds in the UI. The private upload goes only to the local Python server, into a temporary directory deleted after tracking. Browser original stays on the device. Local process interruption can leave operating-system temporary files; use an encrypted device for sensitive sources.
2. Pause at a clear frame and tap/click the bar-end centre. Drag the centre marker, use keyboard arrows for one-pixel adjustment, change patch size, or switch to rectangle selection. Zoom 1.5×/2× in the scrollable viewport for precision. Approximate ±1/30-second buttons are transport aids, not exact frame stepping at all frame rates. Native timeline controls remain available. The tracker uses source timestamps and decodes sequentially to the selected start. Geometry and texture cannot prove that a rack wheel is a barbell.
   Use **צפייה במעקב** to play the overlay: loss pauses playback at the recorded failure frame. **תיקון בנקודת העצירה** opens that frame for a new marker and a new tracking segment. If the target is obscured, move to a later visible frame and mark it there. Restarts never interpolate gaps or stitch velocities, and clear review and scale attestations. Analysis applies only to the latest independent segment. Download **שמירת סימונים ומסלולים JSON** before closing: all segments include source hash, actual start frame, manually placed ROI and candidate samples; they are not independently verified ground truth. Files remain in browser memory until export; page refresh/source replacement clears them.
3. Attest the complete overlay only if it tracks the real bar throughout. Define a measured same-plane scale and confirm a fixed camera. The system also requires observable stable background features. Failed/ambiguous tracks hide all velocities, including earlier candidate segments.
4. Analyze upward motion bouts. These are candidate concentrics, not validated full repetitions. Metric is mean vertical concentric displacement/time, not mean propulsive velocity, peak velocity, or three-dimensional bar-path speed. The reported bounds cover declared reference/endpoint/timing assumptions only, **not all sources of error**.
5. Optional manual IPF evidence checklist and user-clicked spoken-command rehearsal. Plain training mode suppresses judging and cues. Camera trajectories do not establish body/joint criteria. All checklist passes remain non-official, and missing evidence remains indeterminate.
6. Optional personal effort-calibration JSON: at least nine independently reviewed last-rep observations, three per session, across at least three sessions and a RIR span of two. Scope is one pseudonymous athlete, lift and exact protocol/load. Leave-one-session-out errors and monotonicity must pass. No extrapolation. Self-reported labels remain self-report, not demonstrated true RIR. No generic speed-to-RPE table is used.

## CLI

```bash
PYTHONPATH=src python -m vbt vbt-private/source.mp4 --roi 100 100 40 40 --output vbt-private/new-report.json
```

Default output suppresses m/s. `--reviewed-overlay`, known reference options and `--same-plane-fixed-camera` are explicit operator attestations, not independent verification. Use the lab to inspect the track first. Existing reports are never overwritten. CLI reports include samples for private annotation comparison.

## Validation tools

```bash
PYTHONPATH=src python -m pytest -q tests/vbt
python tools/vbt-lab/benchmark.py /tmp/new-synthetic-report.json
python -m compileall -q src/vbt tools/vbt-lab
node --check tools/vbt-lab/lab.js
```

Optional desktop browser integration: install `playwright==1.56.0`, run `python -m playwright install chromium`, ensure `ffmpeg` is available, then `python tools/vbt-lab/browser_check.py`. This generates private synthetic clips and runs a local server, without external test data.

See [IMPLEMENTATION.md](IMPLEMENTATION.md), [VALIDATION.md](VALIDATION.md), [PROGRESS.md](PROGRESS.md). Work remains research-only until separate real-world validation and review.

## Guarded appearance / feature-flow tracking

The tracker keeps the original ROI template. Appearance scores below 0.85 but at least 0.65 are accepted as **overlay candidates only** when forward/backward optical flow within the old ROI agrees with the template displacement: >=8 points, >=70% valid, >=80% displacement consensus, spatial spread >=8px, forward/backward error <0.75px and displacement agreement <=2.5px. Ambiguity and camera motion still stop the track; the template is never adapted into the background. The 0.65 floor applies to short-term flow support; the newer fixed-reference path additionally requires its own warped original-patch correlation >=0.8 as described below. Raw confidence is not inflated. Any flow-assisted segment suppresses all metric velocity output in the CLI and HTTP analysis, even after manual review/scale. This improves annotation continuity, not validated metrology.

## Reference-feature correction and clip bounds

Weak appearance can also be corroborated by fixed seed feature identities from the original ROI. The similarity transform is estimated from at least 8 forward/backward checked points, >=70% RANSAC inliers, spatial support, scale 0.8–1.25 and rotation <=20 degrees. The warped original patch must correlate >=0.8. Seed identities/templates are never refreshed; lost identity support latches this corroborator off. Ambiguous template candidates, camera gates and bounded per-frame motion still stop the overall track. All assisted complete segments remain review-only with no metric velocity; failed segments retain their original failure status.

A warning appears for ROIs near the image border. Use a visible textured part of the plate, not an end that leaves the frame. Optional **סיום קטע** bounds tracking to a chosen source timestamp (or **קביעת סיום לפי הפריים המוצג**). Choose the final visible lockout before re-racking if the goal is to annotate the lift; the software does not detect or certify that lockout. Bounds never bypass failures inside the interval. Source replacement clears bounds; exports/reports include the explicit end timestamp.
