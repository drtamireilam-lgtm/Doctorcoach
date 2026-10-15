# Weekly progress summary follow-up

The existing weekly summary remains in Progress / workout history, with its week selector, recorded targets, adherence, exercise weight/e1RM, ROM, rehabilitation stages and print/PDF export.

This update adds completed-set counts, weekly mean body weight with report counts, and separate before/during/after/next-day workout pain means with coverage counts. Missing reports remain unknown, explicit zero pain remains zero. During-workout pain uses each completed workout's maximum reported pain from completed sets, then averages across workouts. Next-day responses stay with the original workout's week. Cancelled workouts and unfinished sets cannot affect these pain statistics. Current-week comparison explains that a partial week is being compared with a full prior week.

Body-weight rows are read only for the owner or a dietitian with nutrition permission; coach/doctor access does not imply access to these nutrition records. Staff nutrition permission is rechecked after the report's data reads. Hebrew/English labels and PDF output use existing localization and print helpers.

Four new tests cover timing, missing/zero values, completed/cancelled workouts, week-boundary followups, migration-backed report data and body-weight role isolation. TypeScript and all 676 tests passed. Browser/mobile acceptance remains unverified because the supported managed browser plugin is unavailable. No new navigation entry, notifications or schema migration was added.
