# DoctorCoach pilot — deployment checklist

Implemented:
- Supabase tables `public.pilot_applications`, `public.pilot_feedback` with RLS enabled and anonymous access revoked.
- Edge function `doctorcoach-pilot` deployed at `https://nlnyvrbejaqzdbekwlgi.supabase.co/functions/v1/doctorcoach-pilot`.
- Landing page `pilot/index.html` posts to `/register` and `/feedback`.
- Both endpoints require a validated Cloudflare Turnstile token. Requests fail closed until TURNSTILE_SECRET_KEY is configured.

**Not yet production-ready or publicly available.** Next steps:
1. Create a Cloudflare Turnstile widget for the final landing-page domain. Set its public site key in `pilot/index.html` (`window.DOCTORCOACH_TURNSTILE_SITE_KEY`).
2. Set the matching secret as a Supabase Edge Function secret named `TURNSTILE_SECRET_KEY`. Never commit the secret.
3. Deploy `pilot/index.html` to a stable path such as `drtamireilam.com/doctorcoach` (verify DNS/domain control first).
4. Test both forms on the deployed origin, including bad CAPTCHA, duplicate email, mobile layout, and error handling.
5. Add an accessible privacy policy, consent versioning/retention schedule, staff-only approval UI and explicit opt-in before collecting medical data.
6. Add server-side rate limiting and origin restrictions before public advertising.
7. Only after successful live tests, generate a QR pointing to the stable landing page.

Pilot applications are **pending by default**; registration does not grant app access. Existing app routes are unchanged.
