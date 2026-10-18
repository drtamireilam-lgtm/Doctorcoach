# Phone video upload — MOV support

Observed on the owner's iPhone: selecting a .MOV file failed initialization with the MP4/WebM-only validation error. The file itself was not inspected or uploaded by the developer.

Added video/quicktime to the upload, replacement and bulk workflows, consistent phone file-picker accept values, and MIME inference for known suffixes only when the browser omits type or supplies application/octet-stream. Explicit contradictory MIME types are rejected. The server validates the QuickTime ftyp/qt header and declared atom length, preserves the original MIME in private storage, and retains size, ownership, consent and assigned-coach access gates. The new MOV path covers modern QuickTime containers with ftyp; it is not a transcoder or a comprehensive codec validator.

Verification: 1,130 automated tests passed; 0 failed. TypeScript and production build passed. New tests cover phone MIME normalization, bulk naming, malformed/renamed content rejection and private MOV owner/coach isolation. Synthetic header validation does not establish playback of a real camera clip. Live upload and playback on the owner's phone remain pending after Staging deployment. Browser codec support can differ; no automatic HEVC-to-H.264 conversion is implemented.

No live media, user records, old pilot or production deployment changed. Deploy with the pending automatic set-load correction to Staging when the owner returns to the computer, then retry the original short non-personal clip and verify playback after navigation and re-login.
