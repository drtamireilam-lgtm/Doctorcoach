# Workout summary and history continuation
User requested continuing after active-workout UX. Improve read-only finish/history presentation: recorded sets in readable cards, target versus actual effort, warmup separation, preserved source units/per-side basis and explicit uncompleted rows. Jump from saved confirmation to the exact history entry; retain reported retrospective duration without inventing elapsed duration.

Keep ownership, persisted data, load algorithms, comparison rules, schema and authorization unchanged. Only existing completed snapshots are rendered. Zero is data; unknown is not zero. No patient/account writes. Existing isolated LAB rollout scope persists; PR96/98 remain unmerged.

Validate component semantics for unperformed values, RIR0, pain0, source pounds/per-side and warmups/timed units; navigation open/focus; TypeScript/full suite; existing HE/EN320/390/430/768 save/reload/history and recovery browser workflow. One fresh final review. Inspect exact screenshots, then publish tested source to LAB and verify bindings/post-deploy probe. Physical device/authenticated acceptance remains separate.

Fresh review:0Critical/1Important fixed RED→GREEN. Warmups now retain their independent recorded kg contract and never inherit the working set's source-unit/per-side metadata. No deferred minors. Retrospective duration tests confirm reported minutes or explicit unknown, independent of elapsed time until entry.
