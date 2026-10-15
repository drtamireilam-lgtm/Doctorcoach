# Push audit — 2026-10-11

Verified with synthetic accounts and a mocked push provider: separate push consent, consent withdrawal during computation, device ownership/removal, expired endpoints, duplicate dispatch claims, rate limits, generic payloads, and quiet hours in Asia/Jerusalem. No real device notification was sent.

Fixed test-send registration race: immediately before submitting to the provider, require the original device's owner and last_test_at claim to still exist. Provider response cleanup and timestamp updates now also match this claim, preventing an old response from altering a replacement registration. Regression tests reproduced both stale-device cases before the fix.

Current Worker dispatch is triggered by successful POST /api/ requests. There is no attached scheduled automation. A closed recipient app can receive updates following someone else's action, but time-only reminders do not currently run without activity. Existing settings copy states this limit. Provider acceptance is not proof of phone delivery; TTL 0 does not queue offline delivery.

Device acceptance remains outstanding: install the iPhone web app on the Home Screen; allow in-app and phone update consent; enable device Push. With the recipient app closed, have a connected team member send a new message. Confirm generic banner, opening the app, silence during quiet hours, and no new sends after withdrawing push consent or removing the device. Previously submitted notifications cannot be recalled.

Actual Apple/Google push provider delivery and browser UI were not exercised in this environment.

## iPhone activation follow-up

User screenshots show the activation button disabled while still labelled "הפעלת Push למכשיר הזה" and no test button. The preference-save success belongs to the separate preferences form. This establishes an incomplete activation, not provider acceptance. Exact stalled browser stage is not yet known.

Activation previously awaited permission, serviceWorker.ready, browser subscription, and account registration without deadlines. It now reports its stage, bounds waits, explicitly registers a missing service worker, and reuses an active registration without waiting for ready. Failed waits release the activation button with recovery instructions. Permission is still requested synchronously from the user's tap. Browser operations cannot all be cancelled; a late registration can be recovered on reopening/retrying. No automatic notification-permission prompt or automatic test push was added.

Five synthetic browser tests cover stuck operations, existing active registration, missing registration, failure to activate and registration rejection. A repeat on the user's iPhone is required to establish actual activation and banner delivery.

## Service worker installation failure

The follow-up screenshot reached the worker readiness timeout. Direct public HTTP checks returned JavaScript (200) for /sw.js, PNGs (200) for the declared icons, and a redirect (307) for /offline.html. The old install handler rejected on any redirect or failed optional asset, aborting worker installation. Two regression tests reproduced both failure paths before the fix.

Static cache preload is now optional and concurrent, with a five-second timeout per fetch. Failed/redirected responses are still excluded from cache; they no longer prevent skipWaiting and Push installation. Cache version is v4; offline navigation has a plain fallback if no cached offline page exists. A registration without an active worker is explicitly retried. Actual iPhone activation and provider delivery still require the user's repeat test.
# Provider submission follow-up, 18:45 Israel time

The iPhone now displays an active device registration. The subsequent test
submission returned HTTP 500. Production diagnostics identify the precise
failure: Workers reject fetch redirect mode `error` before provider submission.
Changed Web Push fetch to `manual`, keeping authorization confined to the
allowlisted provider origin. Existing callers reject non-2xx responses, including
redirects. A regression test simulates the Worker constraint and a 307 response:
there is exactly one provider request, no accepted result and no sent timestamp.
All 21 Web Push tests pass. Actual provider acceptance and iPhone notification
delivery still require a new device test after deployment.

