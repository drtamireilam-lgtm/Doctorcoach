# Training network stability — 19 October 2026

Continues PR #22 without Cloudflare access. No deployment, migration, main merge or real-data operation.

## Reproduced defect

The training client used fetch without a deadline. A connection that stayed open without responding could keep refresh or a save pending indefinitely, leaving the training controller busy and preventing another operation. This is independent of the Cloudflare sign-in failure.

## Change

Training requests now use a 15-second AbortSignal deadline. Timeout follows the existing unconfirmed-write error path; the controller's existing finally releases its busy lock. No automatic mutation retry was added. Session ID, occurrence ID, expected version and request body remain unchanged. An aborted browser request does not prove the server rolled back: the UI says the change was not acknowledged, and existing server version/conflict checks remain required on retry. Saved history and training formulas are untouched.

Two new tests exercise the actual training request function, with an injected fetch boundary and abort signal. The tests failed before the change (no deadline and no abort rejection), then passed. They check bounded request cancellation, preserved mutation identity/payload and a single attempt without false acknowledgement. These are local tests, not proof of offline behavior on a physical phone or remote LAB.

## Verification

Targeted network tests: 2 passed. Full standalone suite: 1,224 passed, 0 failed, 0 skipped. TypeScript and isolated standalone build passed; generated-target preflight passed. Existing bundle-size/route-classification advisories remain. No live pilot acceptance is implied.
