# Mobile pain-map scene budget

Goal: bound the GPU cost of multiple open pain reports without discarding their forms or health drafts. Existing report components each create their own detailed WebGL scene; closing frees resources, but several reports can stay open concurrently.

Approaches: closing other reports would discard or interrupt drafts; caching shared mutable Three.js scenes risks cross-instance geometry/state corruption. Selected approach: one active pain-map scene per browser document, with all report forms retained. This is an implementation choice within the user's authorized autonomous continuation.

Newly opened maps become active. An inactive map displays a bilingual activation button; selecting it releases the previous scene through the existing abort/dispose path. Closing the active report leaves other maps suspended until explicitly activated. Points, selected structure, notes and retry IDs remain in their existing owner-scoped form state. No health data enters the coordinator, URLs, storage or telemetry.

Scope: pain maps only, no changes to model geometry, medical content, workout persistence, authentication, database or other anatomy viewers. LAB only. Validate concurrent maps, rapid handoff, duplicate/stale leases, StrictMode, draft retention and actual WebGL disposal. Physical iPhone/Safari remains a manual acceptance limitation.
