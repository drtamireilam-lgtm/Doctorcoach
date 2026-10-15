# Guided existing-account connection — candidate only

The standalone sign-in page now prioritizes an existing DoctorCoach account.
New registration is a separate disclosure, with an unchecked required statement
that the user has never had an account and wants a new separate account. Both
actions still obey server-side configuration and ownership checks.

## User journey

1. Enter email and verify an OTP. Wrong/expired/used codes have retry guidance;
   immediate resend is disabled for 60 seconds. Server send/attempt limits remain.
2. A mapped identity enters its existing app directly. An unassigned identity
   sees the existing-account journey and optional new-account disclosure.
3. Once the old bridge has actually been installed and enabled, “Open my existing
   account” requests a signed subject proof and opens the fixed old app route.
   The proof is in the URL fragment, never query parameters or localStorage.
4. The old page removes the fragment from history immediately, asks its trusted
   same-origin server to verify the request, and displays the authenticated old
   account email plus the verified new sign-in email. It signs a return proof
   only after an explicit checked confirmation.
5. The new page removes the return fragment, calls read-only `/auth/link/inspect`
   with its authenticated session, and displays both emails for final confirmation.
   This endpoint validates the signature, issuer, audience, expiry, target subject,
   current session and unused receipt, and does not create mapping/receipt rows.
6. Only explicit `/auth/link` confirmation consumes the proof and creates the
   alias to the original owner ID. Email equality is never an identity link.

Two confirmations intentionally bind approval at each authenticated side.
No raw proof text is shown or copied by the user. Expired requests, mismatched
identities and revoked sessions require a restart. Proofs stay only in page
memory and are deliberately lost on reload or language navigation; restart safely
instead of persisting a credential. There is no email-only recovery fallback.

## Installation status and activation

- `legacy-link-page.ts` and `legacy-bridge.ts` are preparation for the OLD runtime.
  They are not installed on the existing live site by this change.
- A future server route `/account/migrate` must use the existing trusted Sites
  user adapter with its own secrets and the configured standalone public key.
  GET returns the review shell; POST inspection and signing require authenticated
  old ownership and exact same-origin requests. Never trust caller identity headers.
- `DC_LEGACY_BRIDGE_ENABLED` defaults `false`. The standalone Worker offers no
  handoff link until explicitly enabled AND both signing/verification keys exist.
  Enable only after the old route, deployment domain and real ownership tests pass.
- The old app URL is fixed in the Worker. No user-supplied redirect URL is used.
  The low-level signed-proof API remains available for controlled isolated tests.
- Missing configuration shows “Account transfer is not available yet,” disables
  the transfer action and offers the unchanged old app link. It never claims that
  an account was moved. New registration remains off by default too.

## Verification limits

Node tests execute the generated scripts against a minimal DOM test harness to
verify prompts, fragment cleanup, read-only review, explicit confirmation, resend
cooldown and error behavior. These are not real-browser or mobile rendering tests.
Gateway and old bridge tests use synthetic accounts and real signature checks.
The original owners/programs/history/private-file runtime tests must still pass.
Actual delivery, live dual login, device navigation, keyboard/screen-reader behavior
and original production account linking remain staging release requirements.

Both languages, RTL/LTR, system light/dark themes, labelled inputs, focus transfer,
status announcements and mobile sizing are included in the candidate HTML/CSS.
