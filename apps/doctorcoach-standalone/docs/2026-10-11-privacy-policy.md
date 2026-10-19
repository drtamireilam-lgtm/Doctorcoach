# Privacy policy and device push consent — 11 October 2026

## Implemented

- Public, unauthenticated `/privacy-policy` page in Hebrew and English; language selection follows existing app controls. Theme uses existing app styles.
- Persistent footer links to privacy policy and account-deletion request.
- Policy describes current ChatGPT sign-in / Cloudflare storage, role-scoped access, stored data, service purposes, external links, generic Web Push and local preferences.
- Explicit pre-launch draft notice: legal operator, retention periods, processor agreements / locations, age eligibility and final native integrations remain unconfirmed.
- Existing `notifications` consent remains in-app only. A new optional `push` consent requires an affirmative user action. No existing consent or device registration silently opts into device notifications.
- Registration, test sends and background dispatch require BOTH current notifications and push consent. Registration checks both atomically in its SQL write. Dispatch rechecks consent before sending, and disabled subscriptions still rotate through bounded scan pages.
- The UI checks server-reported consent before requesting browser permission. Revoking consent stops new sends; device unregister remains a separate action.
- Existing medical consent revision stays unchanged. Legacy intake submissions default missing push consent to false.

## Verification

- Typecheck and full test suite before packaging; regression coverage includes legacy opt-in, independent revocation, race at subscription persistence, race during dispatch, privacy-control persistence, bilingual policy and unauthenticated route.
- Browser QA not performed: control-browser is unavailable in this managed environment. No substitute browser or preview server started.

## Required before store submission

1. Confirm legal operator / responsible entity, contact details, processor agreements, processing locations and infrastructure-log practices.
2. Obtain appropriate review of exact retention periods and legal exceptions for health records, payment records, audit logs and backups. Do not invent durations.
3. Complete account and associated-data deletion handling. Current page/API records requests only; marking a request handled does not delete data.
4. Decide age eligibility and any parental-consent process.
5. Review final Android/iOS bundles, SDKs, permissions, authentication, payments and push delivery. Resend/Supabase are not asserted as active integrations in this source.
6. Finalize Apple App Privacy / Google Data Safety against that final runtime, remove the draft warning only after resolving these items, and verify public policy/deletion links.

No store declarations were submitted. No medical records were deleted. No native-device delivery was verified.
