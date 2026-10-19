# Lior nutrition role, offers and proposed platform share

Development branch only. No deployment, remote account changes, invitation, price publication, charge, payout, invoice or debt created.

## Product

Lior Zelikson's retained clinical-dietitian profile is visible again alongside Tamir and Nadav, including support for an administrator-confirmed public portrait. A profile card is not a role grant. The existing dietitian role, nutrition consent scopes and medical separation remain authoritative.

ServiceProvider now supports `lior` throughout service parsing, display and the existing appointment request/snapshot flow. No nutrition packages/prices are seeded. The former fixed 1/3/6/12-month placeholder cards are replaced by actual published Lior offers. If none exist, clients see a truthful unavailable/prices-to-be-defined message. Lior can define consultation/meeting offers and describe a package's content and price himself. This does not implement recurring subscription billing, package credits, installment collection or per-visit package consumption.

The dietitian dashboard includes a service manager. It reuses the existing versioned service editor, with the provider locked to Lior and a scoped endpoint. Drafts remain private; listed services permit an in-app appointment request with staff confirmation; Calendly booking retains the existing confirmed-price and valid-link requirements. Requests store a server-owned price snapshot, so changing the catalog does not reprice old appointments. Scheduling and payment verification remain with existing authorized coordination/admin flows; this change does not grant Lior access to all appointment records or connect a personal calendar.

## Commercial proposal

20% of the displayed consultation/offer price for the application; 80% for Lior. Integer agorot; the platform portion is rounded to the nearest agora and the provider receives the remainder. Example 400 ILS: 320 ILS Lior, 80 ILS application.

This is explicitly a proposal/preview, not an accepted contract, live fee, account payable or transfer. The user's wording was approximately 20%. The application share is not allocated between Tamir and Nadav; their internal allocation is not inferred. Tax basis, processing fees, cancellations/refunds, discounts, paid-versus-completed recognition, package consumption, settlement periods and confirmation by the parties remain to be defined before adding an active ledger or payouts. No payment engine or coach-billing rows are modified by the calculation.

## Account setup required later

Set `DOCTORCOACH_LIOR_EMAIL` to Lior's exact authenticated email. The same account must have an active `care_staff` dietitian role; both checks are required. No guess based on name or arbitrary dietitian role can edit his offers. Create/verify his fresh standalone account before assigning the staff role (the existing registration flow reserves staff emails). Then assign dietitian through the existing admin team UI. Client nutrition access still requires their existing invitation/consent, not a public profile or commercial offer.

The service editor requires matching authenticated user ID/provider plus an atomic active-role predicate at persistence. Other medical/training offers cannot be edited or hijacked. No global admin or clinical access is granted. Lior's email is not yet known; no role or email mapping has been set in any remote environment.

## Deployment and validation

No new migration for this nutrition feature. Earlier pending branch migrations **0045–0047** still require a verified backup and isolated staging migration before deploying the branch. Do not use the earlier build/deploy-only instructions until those migrations are applied. Pilot and production remain unchanged.

Tests: integer split, exact account and role scoping, no unrelated offer edits, no seeded prices, private drafts, optimistic conflicts, revocation at the persistence boundary, nutrition-only client scope, and real synthetic appointment requests with immutable old prices. Updated public-team tests reflect the explicit restoration request while preserving administrator-only photo publication. Full tests, TypeScript and standalone build required. Live Lior registration, configuration, price entry and client booking remain pending email/setup, deployment and acceptance testing.
