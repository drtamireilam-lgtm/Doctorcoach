# Integrated rehabilitation and nutrition verification

Two tests exercise the actual onboarding, care, wellness, training feed, progress
timeline and export stores together using all migrations and synthetic data.

| Journey | Verified behavior |
| --- | --- |
| Nutrition | Private assessment; dietitian-only macros plan; owner daily/weekly reports; dietitian weekly response/private note; minimal optional team summary; sharing withdrawal; dietitian link revocation; owner retention/export; coordinator/unrelated-account denial |
| Rehabilitation | Clinician-only episode/return plan; pending milestone remains pending after owner measurement; explicit clinician progression/milestone approval; stale version rejection; episode-linked pain/ROM; revision history; progress timeline; staff role projections; closed-episode write restriction; clinician revocation; owner history/export |

All 582 tests and TypeScript pass. The first nutrition test draft used today's
date for weekly reports; corrected it to the supported Sunday week key. No new
product defect was found, and no visible feature was added in this batch.
Production build/package runs through Sites. This is store integration testing,
not browser end-to-end testing or live D1/R2/payment verification.

Next reconcile completed audit/source work against the master plan and produce
a bounded release-readiness work list. Actual trainee/staff desktop/mobile
journeys, live account behavior and visual QA remain outstanding.
