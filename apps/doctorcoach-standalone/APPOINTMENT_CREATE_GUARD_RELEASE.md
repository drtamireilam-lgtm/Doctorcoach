# Appointment creation concurrency guards

Appointment requests now insert only when the captured service title, provider,
duration, price, visibility and price-confirmation state still match the catalog.
Unpersisted default services remain supported only while no overriding row
exists. A concurrent draft or changed persisted service prevents the insert.

The five-active-request limit is enforced in the INSERT rather than an earlier
count. Requested, scheduled and cancellation-requested entries count; cancelled
entries do not. Other clients retain independent capacity.

Every ID lookup, including after a competing INSERT, checks ownership and exact
service/expected price/client name/preference. Foreign ownership returns 403
without returning that appointment; changed same-owner requests return 409.
Exact retries return the original snapshot, including at capacity and after
later catalog changes, without creating a duplicate or changing saved details.

Verification: TypeScript and all 254 tests passed. Fifteen new cases exercise
service changes, defaults, cross-owner and same-owner collisions, exact retries,
payload mismatches, parallel capacity and inactive entries. Production build
runs during publication. Live browser/account verification remains outstanding.
