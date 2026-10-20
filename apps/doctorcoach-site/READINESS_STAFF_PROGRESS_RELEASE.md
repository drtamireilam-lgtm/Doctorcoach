# Readiness trends and staff progress — 2026-10-09

- The existing readiness tab now plots sleep, energy and perceived stress as
  separate series, with tables for accessible numeric review. Sleep uses 0–24
  hours; energy and stress use 0–10. No combined score, clearance or automated
  training prescription is introduced.
- Charts preserve zero, omit missing/nonfinite data and retain the latest 60
  measurements in date/update order without mutating the original response.
- The staff client's Progress tab now includes the cross-domain timeline from
  the existing client-scoped wellness endpoint. It does not reuse the staff
  member's own data or request broader permissions.
- Coach/medical viewers receive readiness/rehab records only; nutrition records
  appear only with the existing nutrition grant. A shared summary is not expanded
  into full nutrition history. Free-text notes remain outside the timeline.
- The staff timeline has no links into the trainee's own account workspaces.
  Detailed staff nutrition and recovery tabs remain available as before.

Verification: TypeScript passed. Two new test fixtures initially omitted the
required invitation creator; those fixtures were corrected without changing the
production invitation rules. The final publication runs the full 141-test suite.
Tests exercise real store authorization, sharing and revocation, plus chart data
selection and scales. No schema or API changes. Production build is required by
publication. Actual phone/desktop, signed-in browser and live D1 journeys remain
unverified because supported browser QA is unavailable.

Next: inspect the existing rehabilitation journey against the master-plan phases
and milestones requirement before implementing another feature. Browser/account
journey verification remains an outstanding release requirement.
