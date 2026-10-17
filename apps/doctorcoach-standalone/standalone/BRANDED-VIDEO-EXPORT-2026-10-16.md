# Branded video export for stories

Owner request: small persistent DoctorCoach branding in videos shared to Instagram stories, with optional app QR/link, without obscuring the trainee.

Implementation: an explicit branded-copy preparation action on readable video cards for the video owner/admin or the staff client view. Source access is fetched anew through the existing authenticated/private media GET; ownership, assignment and consent guards still apply. An attestation of rights and the depicted people's permission is required in the UI before preparing the copy. This is a user attestation, not a server-verified record of a trainee's publication consent, and it does not authorize bypassing any existing file access restrictions.

The generated MP4 burns the existing Dr.C logo plus DoctorCoach text into every encoded frame. Logo width is approximately 9% of frame width, constrained for landscape; placement is lower-left and raised above the bottom 16% of the frame to reduce story controls overlap. No promise is made that every platform layout will avoid the mark or that an external editor cannot remove it. The private source file is unchanged. Exports use local no-copy transcoding with metadata stripping, preserving audio by default; errors never offer an unbranded file as a branded result.

Optional QR encodes the exact current Staging app URL. It uses a four-module white quiet zone and a minimum of three rendered pixels per module; insufficient resolution causes a visible failure so the user can disable QR or choose a higher-resolution source. QR scanning after Instagram recompression is NOT verified. Update the pinned destination and re-test before public release. QR is not a tappable Instagram story link; the user can separately add Instagram's link sticker.

Prepared output is previewed and then explicitly downloaded or shared through the device file-sharing UI. No Instagram account connection, posting, public bucket setting or automatic transmission to a social platform is added. The default logo-only mark cannot be disabled within this branded export action. Ordinary private uploads remain original/trimmed files and are separate from the social-copy workflow.

Limits inherited from local trimming: output 25 MiB; export duration up to 120 seconds; source limit 200 MiB; browser AVC/AAC and decode support required. Longer videos can first be trimmed through the existing editor. No 9:16 crop is forced; original aspect ratio/rotation should be verified on devices.

Actual checks: 1,136 automated tests passed, zero failed/skipped; TypeScript and standalone build passed. Added layout tests cover portrait/landscape bounds and bottom safe area; renderer test doubles verify source, logo and text drawing on successive frames, QR rendering and too-small QR rejection. These are NOT real browser encoding, playback, QR decoding or Instagram tests. Safari/iPhone export, visible mark/occlusion, rotation, sound sync, file sharing, QR scan after social compression and real consent workflow review remain pending after Staging deployment.

No live deployment, existing-file mutation, publication, message sending or production data change performed.
