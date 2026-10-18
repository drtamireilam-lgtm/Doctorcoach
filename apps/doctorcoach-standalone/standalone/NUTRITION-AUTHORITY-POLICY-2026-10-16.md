# Nutrition authority and coach distribution restrictions

Development only. No remote qualification, staff-role, migration or user-content changes performed.

## Recorded decisions

Lior's email/setup is deferred. Other clinical dietitians may participate later. Verification supports multiple dietitian emails; their provider-specific pricing/settlement onboarding is still future work, not automatically enabled by this policy.

Unqualified coaches must not distribute personal meal plans through DoctorCoach. This is an authorization requirement and a release constraint; do not describe the present implementation as absolute detection across every format.

## Enforced controls

New nutrition_credentials registry records the dietitian email, clinical qualification reference, issuer, active flag, verifying owner clinician and verification timestamp/version. Only the configured owner clinician with a currently active clinician role can attest/revoke. The UI explicitly requires actual manual inspection. This is not an integration with an official license registry. A new active verification requires a currently active dietitian role; a coach cannot self-assert a nutrition credential in a request.

Nutrition-plan and weekly nutrition-response writes require existing client consent, explicit active dietitian association/nutrition grant AND active qualification verification. The predicate is rechecked in the actual SQL write; revocation racing the write blocks it. Nutrition notes require the same credential. canPlan is false without verification. Existing recorded plans remain readable under the existing permissions; none are deleted or rewritten. Coaches retain training tools and personal exercise tracking.

Additional best-effort explicit-prescription text gates cover standard and linked team messages, workspace chat, shared/professional notes, care/workspace program assignment and workspace drafts, check-in responses, video-feedback text and attachment filenames. Guards run on the server and relevant SQL persistence boundaries, not only in the UI. Explicit Hebrew/English meal-plan phrases, calorie prescriptions and some numbered meal instructions are rejected for unqualified professionals. Normal trainee self-report is exempt; existing authorized medical communication remains distinct. This detector may have false positives; neutral references containing 'meal plan' or 'תפריט' can also be blocked.

## Known open gap — NOT absolute prevention

The text gate is heuristic, not semantic moderation. It does not inspect image pixels, video/audio, PDF/Office bodies or external link destinations. An innocently named attachment, disguised wording, alternate language, encoded text or an unrelated free-form field can still contain a plan. Coach document sharing is not globally disabled because it also carries legitimate exercise material. No claim of complete prevention is justified and no AI/OCR inspection has been run.

Before promising or launching with a strict all-formats ban, choose and implement a content-control model: quarantine and approved review of all unqualified-coach outbound arbitrary files/text/links, or a restricted training-template-only communication system. OCR/classification alone still cannot guarantee perfect detection. This limitation is an explicit remaining requirement, not a passed security test. Existing files are untouched.

## Verification workflow after deployment

1. Create/verify the dietitian's standalone account first (staff emails are reserved by registration).
2. Assign dietitian through existing owner administration; no medical/admin grant.
3. Owner clinician manually checks identity and qualification, then records reference/issuer under Dashboard → Nutrition qualification verification. Do not pre-verify Lior or guess his email.
4. Client invitation/consent and nutrition-specific sharing remain required. Revocation blocks future authoring without deleting prior records.

Provider service pricing for Lior remains the earlier separate exact-account mapping; verification does not grant other practitioners access to Lior's offers or turn on payouts. Only clinical-dietitian qualifications are supported now; other qualification classes or dual coach/dietitian roles require a separate explicit policy/design.

## Deployment / validation

New migration **0048_nutrition_credentials.sql**. Pending branch migrations are now **0045–0048**; verified private backup/restore and isolated staging migration are required before Worker deployment. Production and pilot unchanged. User account export includes the account's own qualification metadata. The verification registry is professional staff metadata, managed separately from ordinary trainee data; existing staff account deletion is already a separate protected process.

Tests exercise missing credentials despite assigned role, spoofed client payloads, owner-only/manual-confirmation checks, authorized plan, revocation and persistence race, two message paths, an explicit filename block and normalization. Existing licensed-care test fixtures now explicitly create synthetic evidence; this is confined to tests and does not auto-verify production staff. Full tests, TypeScript and standalone build required. No live credential or device acceptance test performed.
