# Exercise Video Manager — 2026-10-10

## Existing implementation retained

The live Sites application uses ChatGPT identity, D1 metadata and private R2 objects, not the separate GitHub prototype's Supabase foundation. Existing individual uploads, ready/draft states, explicit rights confirmation, published library playback, range requests, signature validation, quotas, trainee set uploads and staff feedback remain.

The user approved retaining R2 instead of migrating to Supabase. No Supabase configuration, API key, new bucket, migration or GitHub prototype changes are required.

## Added

- Up to 50 selected MP4/WebM files per browser queue, at most two concurrent transfers, individual progress/errors and retry of failed files using stable request IDs.
- Exact filename matching against the live exercise catalog, optional `-demo` suffix, manual assignment for unmatched files, and blocking duplicate exercise assignments within the queue. No GitHub aliases are assumed: `bench` is the live dumbbell bench record; barbell bench uses `barbell-bench`.
- Local preview, muscle group, exercise ID, existing execution instructions and explicit notice that the catalog lacks a separate equipment field.
- Existing-video detection with explicit choice between an additional draft and replacement. Replacement requires confirmation and retains publication state. New uploads remain drafts.
- An authorized administrator replaces an existing demonstration object via a separate endpoint. The original stays available until validated bytes are stored and an optimistic conditional database update commits. Losing uploads clean their own object; old-object cleanup occurs after commit. Failed old-object deletion can leave a storage orphan without affecting playback.
- Demonstration writes, publication, replacement and deletion now require the server administrator allowlist plus active staff authorization. Non-admin staff retain authorized read access; trainee media permissions are unchanged.
- Workout demonstrations are opened on demand within the active workout. Playback failures show an error and retry button.

## First upload

1. Sign into the live app with an active staff account whose email is in `DOCTORCOACH_ADMIN_EMAILS` (server configuration).
2. Open `/#team`, then the “סרטוני הדרכה” tab.
3. In “מנהל העלאת סרטוני תרגילים”, choose `rdl.mp4` (MP4, 32 bytes–25 MB).
4. Verify the matched exercise name and preview. Correct unmatched files manually. Resolve duplicate exercise assignments.
5. Click “העלאת קבצים מוכנים / ניסיון חוזר לכשלונות”. Keep this screen open. Selected local files are not persisted across page reloads.
6. After completion, review the saved draft's playback in the video list; use “פרסום בספרייה” and confirm publication rights. It then appears in the existing exercise detail and workout demonstration view.
7. For replacement, choose the exact existing video from the queue's selector and confirm replacement/rights before uploading. The existing published/draft state is preserved.

## Verification boundary

54 targeted tests and the full suite of 611 automated tests passed, including filename/queue, storage permission/optimistic replacement and existing media range/signature checks. TypeScript passed. Production build is required before packaging. Real R2 uploads, XHR progress, video decoding, mobile layout and browser interactions require an actual administrator session and video file; supported browser QA is unavailable here. No live playback acceptance is claimed.
