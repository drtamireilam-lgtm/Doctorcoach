# Exercise library — discover published demonstrations

2026-10-10. Existing exercise details already embedded the demo player, but the
library did not expose which exercises had a published demonstration. Coached
trainees also saw an unavailable independent-add button on every card.

Library now reads the existing public demo listing once, marks exercises with a
ready/published demonstration, and offers a video-only filter that combines with
search, muscle group, kind, level and favorites. Card links lead to existing
details/player. Unknown or failed demo availability is not represented as zero
published videos; errors offer retry and ordinary browsing stays available.

Independent users retain add/edit access. Coached users see the relevant guidance
once and an in-program indicator where applicable, rather than repeated disabled
subscription buttons. No access policy or media endpoints changed. No demonstration
was filmed, uploaded or fabricated; live coverage depends on actual published media.

Inspection also confirmed the existing body map, muscle pages and source links.
Global muscle search retained the previously selected region when opening a result
from another region. Opening a result and restoring its link now select a region
that contains the muscle, retaining the preferred region when several match. An
unmapped muscle gets a neutral heading rather than a false anatomical association.
Back/link navigation resets stale search/topic state; region buttons expose their
selection to assistive technology. No anatomical facts or clinical approvals added.

Verification: TypeScript, new filtering/navigation tests, existing media/read-guard/favorite
regressions and production build. Browser/real live demo playback remains pending.
