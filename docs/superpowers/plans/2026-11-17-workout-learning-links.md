# Workout Learning Links Implementation Plan
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans inline; one fresh whole-branch review.
**Goal:** Complete local muscle/exercise learning and accurate invalid-prescription names without losing program-map context.
**Architecture:** Canonical target helpers, one modal with existing catalog/card/video content, callback wiring in program map; keep existing viewer mounted. Local in-memory state only.
**Tech Stack:** React/TypeScript/Radix dialog, existing Three.js viewer, Node tests and browser CI.
**Spec:** docs/superpowers/specs/2026-11-17-workout-learning-links-design.md
## Global Constraints
- No extra WebGL scene, session/history writes or new clinical content; whole-muscle scope explicit.
- Preserve map scope/exercise/selection/camera/depth/scroll and opener focus; clear on owner/plan change.
- HE/EN320/390/430/768; known names and integer set bounds1–20; unknowns honest.
- Native inline under standing authorization, scoped integration PR plus exact tested union LAB; preserve PR96draft and all existing functionality.
## Review Focus
- Alias IDs and unknown/custom IDs never select wrong library instructions (Task1).
- Invalid known/custom prescriptions retain correct names/reasons and unchanged counts (Task1).
- Exercise→muscle→map, repeated modal opening and Escape preserve the exact camera/scroll and only1renderer (Task2/3).
- Account/plan changes while dialog open discard stale content and do not restore old focus/scroll (Task2/3).
- Missing card/video, model subdivision labels and read-only instructions remain honest and accessible (Task2/3).
### Task1: Targets and prescription labels
Files lib/workout-learning.ts, lib/anatomy-workout.ts, tests/workout-learning.test.mjs, tests/workout-muscle-map.test.mjs.
Interfaces WorkoutLearningTarget = muscle{slug}|exercise{id,fromMuscle?}; workoutLearningTarget(kind,id,fromMuscle?) validates canonical catalog/card IDs; workoutPrescriptionName(item,language) resolves known/custom/unknown; issue copy includes integer1–20.
- [ ] RED tests canonical aliases/rejected targets, invalid bench21/custom invalid/unknown name and unchanged exclusion.
- [ ] Implement helpers and consumer label; focused tests GREEN; commit.
### Task2: Local learning dialog and map callbacks
Files components/workout-learning-dialog.tsx, components/workout-muscle-map.tsx, app/care.css; tests/workout-learning-dialog.test.mjs plus existing map tests.
Interfaces dialog controlled target,onNavigate,onClose,returnFocus HTMLElement|null and capturedscroll; static content export uses existing learningCard/MuscleExercises/WorkoutDemo/ExerciseMuscleSummary; one retained mapviewer.
- [ ] RED actual component-handler tests model→muscle, contributor→exercise and close/back state, rendered referenced muscle and exercise content, no extra model.
- [ ] Implement modal keyboard close/back, contextual labels, scroll/focus restoration, scoped responsive styles and map buttons/callbacks.
- [ ] Focused tests and tsc GREEN; full npm test GREEN; commit.
### Task3: Browser, review, integration and isolated release
File scripts/anatomy/training-pain-smoke.mjs extend existing synthetic8case matrix.
- [ ] Add canonical muscle→strength/stretch→exercise→muscle→map, existing demo empty/loading, Escape, exact source pick/camera/scroll/occurrence retention, no additionalcanvas, owner/plan reset and no posts; use real Radix dialog and source components.
- [ ] One fresh reviewer; Important fixes one RED→GREEN pass, fullsuite GREEN. Publish featuretree onintegration and uniontree preserving deployedDC4 in existingPR98; exacttree equality.
- [ ] Required appropriateCI on exactfinaltrees GREEN; scoped featuremerge only; deploy tested unionLAB; verify version,13binding identities and postreleasepublicprobe. Report limitations honestly.
