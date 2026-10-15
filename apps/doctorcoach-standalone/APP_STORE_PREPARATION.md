# DoctorCoach — store preparation, first implementation

Updated 2026-10-11. Canonical source: this Sites repository.

The detailed cross-platform login/account-linking plan is now saved in
`MOBILE_IDENTITY_PLAN.md`. Recommended MVP: DoctorCoach email-code login,
verified linking of existing Sites identities, and a shared authorization layer.
No new authentication provider or native client has been deployed.

## Shipped in this step

- Public `/account-deletion` page, readable without signing in or installing the app,
  in Hebrew and English, with light/dark theme support.
- Signed-in visitors can submit an explicitly confirmed deletion request directly
  from this page and see their own request status and receipt.
- Visitors who cannot access their account can contact the existing support
  WhatsApp number. This opens a draft; it does not send a message automatically.
- Account settings link to the public page; the existing in-app privacy workflow
  uses the same server operation.
- Request and audit insertion are transactional. Retries and parallel requests
  converge on one pending request per owner/kind. Cross-owner IDs and completed
  IDs cannot return false success. Deletion requires explicit confirmation.
- Pure sign-in/sign-out URL helpers are separated from the server identity helper
  so the public client page does not import server-only request headers.

The existing administrator privacy queue still handles requests manually. This
change does not purge D1/R2 records, cancel payments, delete the ChatGPT identity,
or prove App Store/Google Play compliance. Do not describe a pending request or
an administrator's handled flag as proof that all data has been deleted.

## Verified architecture and next priorities

1. Decide the legal publishing entity and start developer-account verification
   (organization identity, domain/contact details and D-U-N-S where applicable).
2. Define independent mobile identity and account linking before packaging the
   client. Hosted Sites authentication currently owns sign-in and injects trusted
   request headers. No custom OAuth provider or mobile bearer-token bypass has
   been added. Existing data is keyed by the Sites user ID: a mobile identity
   migration must preserve ownership through a verified mapping, never by trusting
   an email or user ID supplied by a client.
3. Choose a supported mobile deployment architecture. The existing React/Vinext
   app uses a Worker backend with D1/R2. It is not a static export and cannot simply
   be copied into a native package as-is. Capacitor is a candidate after a build,
   auth and networking compatibility check; a remote website wrapper alone is
   not sufficient evidence of Apple's minimum functionality requirement.
4. Inventory data and approve a retention policy with categories, reasons,
   durations, processing time and responsible operator. Implement and verify
   actual account/data deletion with retention exceptions, backups and provider
   handling. The public request page is one part of this workflow only.
5. Classify digital memberships separately from clinical/coaching services and
   review applicable store billing rules before implementing mobile checkout.
6. Integrate native push delivery for the selected mobile architecture. Current
   Web Push is an existing web capability; event-driven push and time-triggered
   reminders have different requirements. Store packaging does not fix the
   unsupported Sites cron trigger or verify phone delivery.
7. Build/sign iOS and Android packages, prepare reviewer access and store assets,
   then run TestFlight/Play testing on real devices. No IPA/AAB/APK is produced
   by this step. Phone acceptance testing remains deferred at the user's request.

## Validation

Account-request tests cover confirmation, ownership, collision/retry handling,
parallel submission, transaction rollback, completed IDs, preservation of existing
profile data and safe sign-in return URLs. Run with the onboarding suite, full
regression suite, TypeScript and the standard Sites production build.

Browser visual QA was unavailable in this environment. Verify both languages,
both themes, keyboard navigation, signed-out sign-in return, signed-in request
submission and the support link on real devices before release to stores.

## Official policy references reviewed

- https://support.google.com/googleplay/android-developer/answer/13327111
- https://support.google.com/googleplay/android-developer/answer/13634885
- https://developer.apple.com/app-store/review/guidelines/
- https://capacitorjs.com/docs
