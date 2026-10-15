# Latest measurement in the personal injury summary

My File and contextual My Program injury summaries now show the latest explicitly
linked measurement with the observation date, motion, response timing, pain,
ROM and reported function. Zero remains zero; absent ROM is shown as not measured.
The clinician-selected stage includes its author/update date separately from the
injury record's update date. No linked observation produces an explicit empty state.

The latest observation is selected by measurement day, then edit timestamp and
stable ID for ties. Editing an old observation does not replace a later day's
observation. Unassigned measurements, different episodes and anatomically
mismatched observations are excluded. Values from different observations are
never combined or converted into a readiness/clearance score.

The authorized wellness response retains each episode's latest linked observation
independently of its 730-record general log limit, including closed episodes.
The query joins episode and measurement within the same client and matching
region/side. No schema migration, backfill or clinical rule changes.

Verification: TypeScript and all 166 tests passed. Three added tests cover
explicit matching, zero/missing values, chronological ordering, deterministic
ties, input immutability, old observations beyond 740 newer records, closed
episodes and cross-account isolation. Production build runs during publication.
Browser layout, real signed-in journeys and production D1 behavior remain
unverified. Summary values are self-reported observations, not medical clearance.
