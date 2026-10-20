# Seven-area navigation — 2026-10-09

Implemented the approved information architecture using existing workspaces and
hash routes. No database, entitlement or clinical decision rules changed.

- Seven primary areas: Home, My File, My Program, Progress, Exercise Library,
  Anatomy/Learning, Contact. All seven appear in the desktop sidebar and phone
  menu. Four frequent phone shortcuts plus the full menu avoid seven cramped tabs.
- Secondary pages retain their old links and browser back/forward behavior, with
  the appropriate parent area selected. The old More link resolves to Home.
- First visits stay on Home. Team introduction, process and approved public
  stories precede voluntary entry to the questionnaire. Training still requires
  the existing server-side intake and consent gates.
- The File contains questionnaire, injury and settings navigation. Membership and
  privacy are inside settings; membership is distinct from an assigned program.
- Active sessions are reached from My Program. Readiness is contextual to the
  program. Progress groups performance/history, nutrition/measurements and pain/ROM.
- Contact groups messages, appointments, consultation and feedback. Instagram
  appears there, not in every footer. Floating WhatsApp booking remains.
- Staff tools appear only for verified staff roles, separately from trainee areas.
- The tour now covers all seven areas on both phone and desktop. Early dismissal
  still does not mark it complete. Phone menu supports Escape and keyboard cycling.

Verification: TypeScript and the 128-test suite passed before final packaging;
navigation tests cover legacy parent routing, staff exclusion, seven-area ordering
and tour behavior. Production build is required by the publishing workflow.
Actual visual/mobile, signed-in browser and live D1 journeys were not exercised.
