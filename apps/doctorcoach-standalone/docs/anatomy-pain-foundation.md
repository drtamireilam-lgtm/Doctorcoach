# Anatomy pain mapping: persistence foundation and blockers

Status: investigation/design only. No pain API, pain storage, schema migration, or symptom capture UI is implemented by this document. Anatomy navigation and muscle selection must not be presented as a symptom diagnosis. Existing pain scores remain unchanged.

## Verified current behavior

- `app/api/feedback/route.ts` authenticates with `getChatGPTUser`, uses `readPayload` for JSON/cross-site/size checks and `privateJson` for no-store responses. `lib/community-store.ts` limits normal feedback reads to `owner_id`, reserves management/review for admins, validates section/region/category, handles duplicate IDs with ownership checks and caps submissions at 20/hour. These are product/content feedback categories (`lib/feedback-topics.ts`), with admin reporting/CSV via `app/api/feedback/report/route.ts`. They do not carry health-consent checks. **Do not send pain reports or health notes through feedback.**
- Existing pain data includes training before/after/set/next-day scores, weekly care check-ins, medical profile pain-area text, and wellness rehab measurements. None is an existing precise anatomy-click pain-location endpoint.
- `app/api/wellness/route.ts` authenticates; POST calls care authorization and `wellnessStore.save`. `lib/wellness-store.ts` requires health consent, parses known record kinds, uses `client_id` scoping and version concurrency, and repeats current access/consent conditions in the mutation SQL. Rehab records may be written only by the trainee (`lib/wellness-write-guard.ts`).
- Wellness bundle reads include rehab for authorized care connections. Precise symptom locations must not silently inherit this visibility: decide whether they are medical-only or shared with other care roles, then enforce that decision in both query filtering and final revocation checks.
- `lib/wellness.ts` has a closed `WellnessKind` union/parser. Its rehab schema requires motion, function, response, region and side; arbitrary extra pain-location fields are not retained. Its record data type is flat primitive values. Posting invented fields or an invented kind to the current API is not supported.
- `lib/account-deletion.ts` already removes wellness records by `client_id`. Any separate table requires explicit deletion/export/retention integration. Existing feedback admin export must never become a symptom export by accident.

## Proposed draft contract (future work)

Keep the draft in component memory only. Do not use localStorage, sessionStorage, URLs, analytics events, console logs, product-feedback text, or offline service-worker caches for health information.

A future validated draft should contain:

```ts
type AnatomyPainDraft = {
  location: {
    x: number; // finite normalized 0..1
    y: number; // finite normalized 0..1
    view: 'front' | 'back' | 'left' | 'right';
    regionId: string | null; // explicitly selected catalog region
  };
  intensity: number; // finite 0..10; preserve an explicit zero
  occurredAt: string; // valid datetime with explicit timezone; normalize to UTC
  notes: string; // trimmed, maximum 1500 characters
  exerciseId: string | null; // optional known exercise reference
};
```

Coordinates refer to the unzoomed anatomical model content rectangle, excluding letterboxing and panels. Convert pointer coordinates through the inverse pan/zoom transform before normalization; reject clicks outside the model. Store the view and future model coordinate-version identifier with persisted coordinates. Side-view changes must not reinterpret an existing marker. Region and optional exercise IDs need catalog validation; custom exercise references additionally need ownership validation. A marker identifies **where the person perceives pain**, not an injured muscle. Keep any educational muscle suggestion in a separately labeled, non-diagnostic field; never derive or save a diagnosis from proximity.

## Safe persistence follow-up

1. Decide the care-role visibility of symptom locations before enabling save. Default proposed policy: owner reads/writes; only actively connected clinical staff with medical access read. This is a proposal, not current wellness behavior.
2. Prefer extending the existing authenticated wellness path after review. Add an explicit `painLocation` record kind, parser and typed flat serialized data contract (or deliberately migrate to a structured data type). Add any required database CHECK migration after inspecting the actual schema; do not assume a free-form JSON column alone enables a kind.
3. Add the kind to self-only write enforcement. Require current health consent, derive owner from the session, and reject attempts to target another client. Keep atomic SQL owner/access/consent guards and optimistic version checks. Validate IDs, model version, normalized coordinates, explicit view, intensity, calendar-valid datetime/timezone, bounded notes and exercise ownership on the server.
4. Extend bundle/read filtering and final current-access verification for the agreed clinical access policy. Do not merely add the kind to the current shared rehab list. Deny access after revoked connection or medical grant; do not grant administrative product-feedback access.
5. Keep `getChatGPTUser`, `readPayload`, `privateJson`, `apiError` and existing care/consent helpers. Confirm deletion, user export, retention and any clinical export cover the new kind; ensure no PHI reaches logging, analytics or browser caches.
6. Wire UI only after server behavior passes the tests below. Show unsaved/saving/saved/error state, require explicit submit, retain drafts in memory on recoverable errors, reset on account change/sign-out and avoid a saved claim before a successful authorized response.

## Required tests before enabling persistence

- Pure draft validation: zero and ten intensity, fractional/NaN/infinite/out-of-range values, malformed/missing locations, all four views, normalized edge coordinates, catalog/owner-scoped exercise IDs, notes limits, timezone and invalid calendar dates. Unknown owner/muscle fields cannot leak into output.
- Pointer mapping: each view under zoom/pan, mobile resizing, letterboxing, outside-model clicks, keyboard placement, marker alignment after view changes.
- API/store: unauthenticated 401, cross-site denial, missing/revoked consent, forged client ID, another user's record/exercise ID, valid owner save/read, duplicate request consistency, version conflict and concurrent consent/access revocation.
- Visibility: ordinary coach/coordinator/dietitian denied unless explicitly authorized by the agreed policy; clinical connection removal and medical-grant withdrawal take immediate effect; no product-feedback reporting exposure.
- Privacy lifecycle: no-store headers, no browser persistent storage/analytics payloads, deletion and export include the record, logout clears the in-memory draft. UI errors never claim a save succeeded.

No automated runtime test is warranted for this documentation-only change. The current test runner may require `--test-isolation=none` in this sandbox because spawning child test processes can fail with EPERM.
