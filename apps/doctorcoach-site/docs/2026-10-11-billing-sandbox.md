# DoctorCoach billing foundation — isolated mock ledger

## Audit

Current Site source: da2b730e8b5dfa50b2e6991cd0707f2ca69ee9e4 (saved version 91). Existing services/prices, manual membership orders/approval, training-access expiry and permission checks are retained. There is no payment-provider integration in this checkout. The GitHub root remains a separate legacy app; the current Site source is reviewed in draft PR 4.

## Implemented

An isolated administrator-only simulation workflow in Settings, exposed only when `DOCTORCOACH_BILLING_MODE=mock`. Defaults off. No environment variable was changed in hosting. The UI silently hides the testing area when disabled or unauthorized; it never offers a real checkout.

Additive migration 0018 adds four mock-only tables: versioned product definitions, immutable-price-snapshot orders with simulated subscription period/state, idempotent event ledger and transaction/refund ledger. Simulated one-time payments and 1/3/6/12-month products, success/failure, renewal/failure, end-of-period cancellation, expiry, full current-period refund and simulated access activation/removal are covered. Cancelled or failed-renewal subscriptions retain already-paid access until expiry, without automatic extension. Event IDs and transaction IDs reject duplicate/conflicting use. D1 batches keep state, event, transaction and audit changes atomic. Month ends/leap days clamp correctly.

Only allowlisted authenticated administrators create products/orders or simulate events, and events are limited to their own orders. Ordinary users cannot claim payment success, change prices/status or read another account's orders. No card/CVV fields, external provider calls or medical data transfer. Existing real training permissions never read these tables: mock success cannot unlock real features or override clinical restrictions. Product edits do not change existing orders or live prices.

## Verification

TypeScript and **660/660 automatic tests** pass, including 11 new mock-billing cases. Full build is recorded in source packaging. Prior GitHub legacy CI run 38085391730 succeeded; it does not validate the current nested Site app. Browser/mobile and actual provider sandbox have not been tested. The feature remains disabled and un-deployed.

## Remaining / release boundary

This is a mock foundation, not operational billing. There is no Cardcom/Tranzila adapter, verified provider webhook, hosted checkout, invoice/receipt link, recurring charge scheduler, cancellation/refund API, live payment event processing or actual paid feature integration. A simulation event is an authenticated admin test action, not a provider verification result. Upgrade/downgrade policy, failed-payment grace, service-specific medical messaging entitlements and refund business rules require definition. No live database migration or payment configuration was performed.

Cardcom test-account/quote request remains pending with the user. No email was sent, paid account opened, price changed or customer charged. Do not place provider secrets in chat or public variables. Before real payments, obtain a confirmed non-charging provider test environment, implement and test its documented authentication/verification adapter, keep mock/live ledgers separated, then review real entitlement mapping, receipt handling and service terms. Deploy or activate only after explicit approval.

## Manual test instructions for a future authorized test environment

Apply migration 0018 to the test database after migration 0017, and set the mode to `mock` there only. Sign in as an existing allowlisted admin and open Settings → Administrator payment testing. Create a clearly named test product, create a simulated order, then test payment/renewal/cancellation/refund actions. No financial operation occurs. Turning the mode off disables the API/UI again and preserves records for audit. There is no production switch or live mode in this implementation.
