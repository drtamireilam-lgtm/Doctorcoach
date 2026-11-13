# DoctorCoach 3.0 — responsive acceptance evidence

Date: 13 November 2026. Baseline: PR #75 `e376c91399600cf1274cb159af35876b2728c2ba`, stacked on PR #74 `c58ac66977b37834ac84a4270b05772ec622da20`, integration `dc92326a326db388932af46c92f1176287a9a6e8`.

## Fresh browser prerequisite result

Command:

```sh
timeout 15 chromium --headless --no-sandbox --disable-gpu --dump-dom about:blank
```

Result: exit 134 before any application navigation. Chromium reports `FATAL:chrome/browser/process_singleton_posix.cc:297 ... socket() failed: Operation not permitted (1)`; crash reporter also reports `ptrace: Operation not permitted (1)`. This is an execution-environment prerequisite failure, not a reproduced DoctorCoach defect. No browser restrictions were bypassed and no acceptance screenshots were created. No rendered layout, contrast, keyboard, focus, screen-reader or physical-device pass is claimed.

## Local execution-host matrix

| Surface | HE/RTL 320/390/430/768 | EN/LTR 320/390/430/768 | Scope |
|---|---|---|---|
| Retrospective editor, free workout | BLOCKED at browser launch | BLOCKED at browser launch | Existing real React + disposable SQLite harness retained |
| Retrospective draft save/reload/history | BLOCKED at browser launch | BLOCKED at browser launch | No hosted account or real data used |
| Retrospective program copy/prescription integrity | BLOCKED at browser launch | BLOCKED at browser launch | Existing assertions retained |
| Active workout save/edit/reload/finish/history | BLOCKED at browser launch | BLOCKED at browser launch | Existing full Page + SQLite harness retained |
| Plan/workout/history layout | BLOCKED at browser launch | BLOCKED at browser launch | Focused matrix command below |
| Physical iPhone/Safari | UNVERIFIED | UNVERIFIED | No physical device available; Chromium/WebKit cannot establish physical Safari acceptance |
| Signed-in LAB/provider flows | UNVERIFIED | UNVERIFIED | No synthetic hosted account established in this workstream |

## Avoiding duplicate completed work

PR #74 already records historical Chromium/WebKit rendered consultation checks at 320/390/430/768/1363 and boundary checks at 1100/1101, plus the 768 English header fix. That evidence is retained as historical; it was not rerun or claimed as current LAB evidence. PR #75 already contains the retrospective browser fixture. Existing premium-workout fixtures already exercise actual React save/edit/reload/finish/history and fractional next-set load against disposable SQLite; they were reused instead of replaced.

## Reviewable acceptance improvement

`apps/doctorcoach-standalone/scripts/premium-ui-3-browser-smoke.mjs` now accepts `DC_UI3_WIDTHS`. The override applies to workout persistence flows and both language layout loops, enabling the required 320 px active-workout acceptance without rerunning unrelated widths. Default CI matrices remain unchanged. Invalid widths fail fast. Syntax check: `node --check scripts/premium-ui-3-browser-smoke.mjs` passed.

Commands for a host that supports browser launch, from `apps/doctorcoach-standalone`:

```sh
DC_CHROMIUM=/usr/bin/chromium node --experimental-strip-types scripts/retrospective-workout-browser.mjs
DC_CHROMIUM=/usr/bin/chromium DC_WORKOUT4=1 DC_UI3_WIDTHS=320,390,430,768 DC_UI3_SECTIONS=plan,workout,history DC_UI3_EVIDENCE=.sites-runtime/doctorcoach3-dark node --experimental-strip-types scripts/premium-ui-3-browser-smoke.mjs
DC_CHROMIUM=/usr/bin/chromium DC_WORKOUT4=1 DC_UI3_WIDTHS=320,390,430,768 DC_UI3_SECTIONS=plan,workout,history DC_UI3_THEME=light DC_UI3_EVIDENCE=.sites-runtime/doctorcoach3-light node --experimental-strip-types scripts/premium-ui-3-browser-smoke.mjs
```

Both harnesses restrict browser requests to synthetic local endpoints; SQLite is disposable. These commands do not deploy, migrate LAB, create real bookings or write provider events. Captures and JSON results, when generated, remain under `.sites-runtime`.

## Physical acceptance remaining

Check safe-area and bottom-navigation overlap, date/time native controls, keyboard-open layout, RTL/LTR order, long exercise names, decimal load visibility, touch target size, focus visibility and return, error/status announcements, draft recovery and interrupted connectivity. Exercise actual iPhone Safari and authorized synthetic signed-in LAB accounts separately after approved release steps. No current code-only check clears these gates.

## Fresh DOM fallback evidence — passed, with explicit limits

A real React editor was bundled with esbuild and mounted in jsdom, using the actual retrospective store and disposable migrated SQLite. Both Hebrew and English flows passed: select 20 October 2026 at 19:45 Israel time; enter a private free exercise and 33.125 kg while keeping quantity unknown; save draft; unmount/remount and reload the saved date/time; submit and verify performedAt `2026-10-20T16:45:00.000Z` differs from recordedAt; load a program copy retaining two prescribed sets and original RPE 8; attempt another completed workout on the same day and verify the duplicate warning prevents creation.

Reusable fixture: `scripts/retrospective-workout-dom.mjs`. This supplements browser acceptance; DOM emulation has no visual layout and does not clear any blocked row above. No CSS change was made without rendered reproduction.

The current workspace reused existing optional jsdom/esbuild packages without modifying application manifests or lockfiles. The script accepts `DC_JSDOM_MODULE` and `DC_ESBUILD_MODULE` module specifiers so another test host may supply those tools; normal installed package names are the defaults. Run once per language:

```sh
DC_LANGUAGE=en node --experimental-strip-types scripts/retrospective-workout-dom.mjs
DC_LANGUAGE=he node --experimental-strip-types scripts/retrospective-workout-dom.mjs
```

Successful output explicitly labels DOM emulation. No screenshot is attached because Chromium could not launch; no historical screenshot is presented as a new capture.

## Program substitution and active-set event acceptance

Fresh `scripts/program-substitution-dom.mjs` passed in HE and EN using the actual new substitution component and React events. Current/incompatible choices are excluded. Selecting a replacement does not emit a mutation; explicit Apply emits one patch, retains occurrence identity and target RPE, clears the starting load, and resets the selector. No geometry claim is made.

Fresh `scripts/set-autosave-dom.mjs` passed against the actual private SetLine component (a test-bundle-only export; production module exports unchanged). Real timers verify the debounce, 33.125 kg autosave with `done=false` and `autoNextLoad=false`, and retention of a newer weight edited while an earlier save is in flight. A simulated failed/conflicting save supplies a newer untouched quantity; the dirty weight stays visible and no automatic retry occurs for over two seconds. An explicit local edit unblocks a new autosave; only the explicit completion button sets `done=true`. This verifies UI effects and event wiring in addition to helper unit tests; the controller is synthetic, so HTTP authentication and real connectivity remain separate gates.

Both optional-dependency scripts use the same `DC_JSDOM_MODULE` / `DC_ESBUILD_MODULE` inputs as the retrospective DOM fallback. Syntax and focused diff whitespace checks passed. Initial harness attempts encountered missing jsdom globals and CommonJS bundling prerequisites; those were harness setup failures corrected before the successful assertions, not product defects.

## GitHub CI rendered acceptance supersedes the local browser blocker

PR76 initial source head `6a842469a9a7e87681a9d1a9c40725f402fb1d76`, source tree `2694c4606e650a5fa74f3de962d19f16db641103`, passed candidate CI run [43452922055](https://github.com/drtamireilam-lgtm/Doctorcoach/actions/runs/43452922055). The tested synthetic merge `91c9a7d3c644253d449149d3d75d9e3cc890b0a5` has the identical tree; no branch was actually merged. Logs and artifact were inspected.

| Fresh rendered Chromium check | Result |
|---|---|
| Retrospective free/program draft/history, HE/EN 320/390/430/768/1363 | 10/10 pass; zero document overflow or out-of-viewport controls |
| Active workout save/edit/reload/finish/history/decimal next-load, HE/EN 320/390/430/768 | 8/8 pass with disposable SQLite |
| Plan/workout geometry, HE/EN 320/390/430/768, established dark theme | 16/16 pass; zero document overflow; no browser errors |
| Timer navigation/start/pause/reset | Pass |
| Physical iPhone/Safari, VoiceOver and signed-in hosted LAB | Still unverified |

Artifact14052986290 contains 54 evidence files (including screenshots and JSON matrices), SHA256 `16ca641c5f3d9f39c32a9693b18992a633264f1455f26049cf40ccb99f5357d7`; initial GitHub retention ends 20 November2026. Screenshots are synthetic, not real-user data.

Manual inspection of the downloaded 320px screenshots found two visual issues beyond the original out-of-viewport detector: native date/time controls compressed their text inside the two-column form, and the Hebrew timer action split its word onto two lines. A focused follow-up uses a single form column at <=430px and preserves the compact timer action as a non-shrinking single line. Added rendered assertions for adequate date/time control width and single-line timer text, retaining all existing geometry/workflow checks. Exact final CI/evidence is tracked in PR76's description. No visual identity replacement or broad CSS refactor.
