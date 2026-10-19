# Coach recurring-payment foundation

Production is deliberately disconnected. `GET /api/coach-payments` is read-only;
no browser endpoint can activate a mandate, alter prices, create charges or mark
payments successful. This is separate from the old simulated billing sandbox.

Business policy: ILS 8 (800 agorot) for each actual billing seat; monthly in advance
at Israel local month start, no proration. Only manager-approved removals lower the
billing roster. Pending removals count. Requests/approvals are locked in the final
48 elapsed hours before Israel month start. Client consent withdrawal remains
available independently and does not falsify the financial count.

## Connect a provider

1. Obtain a merchant account supporting variable recurring charges, hosted
   payment authorization, idempotent collection and transaction lookup.
2. Implement `CoachPaymentProvider` on the server. Store API/webhook secrets in
   Sites runtime secrets. Never collect card numbers/CVV in DoctorCoach or store
   them in D1. `coach_payment_mandates.reference` is the opaque provider mandate
   reference, not card data; it is excluded from client JSON.
3. Add a signed-in, workspace-owner-only hosted authorization flow with an
   expiring single-use server state tied to workspace and owner. Explicitly show
   and accept the ILS 8 variable-quantity recurring-payment terms before redirect.
4. Verify provider webhook signatures, event identity, merchant account and the
   original authorization state before writing/updating mandates. Reject replay,
   wrong workspace/owner, out-of-order revocation/reactivation and caller-supplied
   `paid`/mandate states. There is intentionally no unsigned callback endpoint.
5. Use `prepareMonth(workspaceId, month)` only as an authenticated internal service
   operation. It freezes a unique `(workspace, month)` record using billing-seat
   history at Israel month start, not the later mutable roster. A DB trigger blocks
   modifications to frozen quantities, rate, month and amount. No retrospective
   charges before foundation activation are allowed. Zero seats creates a skipped
   record; no provider call is made.
6. Implement internal service authorization and durable scheduling using Sites
   supported unattended access (native Worker Cron is unavailable here). After
   authorization and a real adapter are validated, enable collection explicitly
   and schedule first-of-month Israel runs, plus provider-state reconciliation.
   No schedule or collection is enabled in the foundation release.
7. Call `dispatch(id, adapter, true)` from that service only. Both explicit
   enablement and a ready adapter are required. A live, matching mandate/version
   is rechecked when claiming a job atomically. A job is sent once. A timeout,
   crash or unknown response is reconciled by lookup of the SAME idempotency key;
   it is never blindly resubmitted. Confirm key, ILS currency, frozen amount and
   a unique transaction reference before marking success. The unique receipt
   index prevents one provider transaction from settling multiple monthly jobs.
8. Add signed provider receipts/webhooks, authorization cancellation, customer
   notice/receipt delivery and account suspension/collection-failure policy with
   the chosen provider. A simulated payment never grants real clinic or training
   entitlements. No automatic suspension/refund is implemented in the foundation.

## Validate before activation

Use the provider sandbox for hosted authorization, signature/replay failures,
mandate revocation during collection, one concurrent claim, network timeout and
reconciliation, duplicate receipts, declined charges, DST month boundaries,
first-month start, zero seats and approved removal after a frozen snapshot.
Do not enable production with a test adapter. Enable provider, secrets and schedule
only after passing those checks. Never log or export mandate references/secrets.
