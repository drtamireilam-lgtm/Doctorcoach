# DoctorCoach pilot landing page (work in progress)

Preview: open `pilot/index.html` in a browser. It is **not live**.

## Before accepting real registrations
1. Deploy a secure server-side API with POST /register and POST /feedback.
2. Create Supabase tables using `pilot/schema.sql`; do not expose the service-role key in the browser.
3. Add rate limiting, CAPTCHA, server-side validation, staff authorization, and privacy/retention policy.
4. Set `window.DOCTORCOACH_PILOT_API_URL` to the deployed API base URL before this page's inline script runs.
5. Publish the landing page at a permanent URL (e.g. /doctorcoach) and test on a second device.
6. Generate the public QR **only after** the permanent landing page is live. Later, change the landing-page CTA to App Store/Google Play without changing the QR.

This branch does not modify the current app or enable anonymous access to medical data.
