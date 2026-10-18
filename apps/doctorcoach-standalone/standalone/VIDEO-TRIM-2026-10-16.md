# Local video trimming before single-video upload

The owner requested in-app start/end selection instead of editing a camera clip in another app. This adds a local editor to single review/demo upload, including videos linked to a workout set. Bulk upload remains unchanged.

## Behavior

Select a source, preview it, choose start/end with accessible range controls, then prepare the clip. A second player previews the actual resulting file. Upload is unavailable until a file is explicitly prepared or the user explicitly chooses the full original. Any later range/audio change invalidates that selection; a new upload request ID avoids retrying an old initialization against changed bytes. No trimming failure falls back to uploading the source.

The browser dynamically loads pinned Mediabunny 1.60.0 (MPL-2.0 dependency; chosen within the repository package maturity policy), decodes and re-encodes to AVC/AAC MP4 locally. Packet copying is disabled to avoid retained media outside trim boundaries through keyframe expansion/edit lists. Descriptive metadata is removed. Audio is retained by default; unsupported audio is not silently discarded. The user may explicitly deselect audio. Existing authenticated upload, byte validation, consent, access and private storage remain unchanged. No source file or crop selection is sent to a third-party conversion service.

Source limit 200 MiB / 10 minutes; selected duration 0.25–120 seconds; output limit 25 MiB. Output has frame/audio-sample granularity, not an arbitrary infinitely precise boundary. Files that the browser cannot decode/encode fail visibly; there is no server transcoding fallback. Preparation may be slow, use battery, or fail due to mobile codec/memory limits. Cancel and component unmount abort the job and dispose conversion resources; object URLs are revoked. A full original up to the existing 25 MiB upload limit can still be chosen explicitly without trimming.

## Validation and limits

Actual automated run: 1,134 tests passed, zero failed/skipped. TypeScript and standalone production build passed. Added tests cover range validation, passing no-copy transcoding and metadata stripping to the conversion engine, producing a distinct MP4 result, unsupported-codec failure, encoding failure, cancellation, explicit audio removal, source limits and disposal. These orchestration tests use a conversion test double; they do NOT prove actual frame/audio encoding or device playback. Real Safari/iPhone and Chrome video output, audio sync, rotation, boundaries, rejection/abort and subsequent private upload/playback need live browser verification after a Staging deployment. Do not mark them passed from build success.

Recommended owner test: a short non-personal clip showing distinct beginning/middle/end, with spoken markers if testing audio. Select only the middle, prepare and inspect the resulting player, upload, reopen and verify omitted portions cannot be played. Also cancel preparation and ensure nothing uploads. Full-source fallback must always require an explicit choice.

No deployment, existing-data mutation, source migration or old-pilot change performed.

Reference: https://mediabunny.dev/guide/converting-media-files
