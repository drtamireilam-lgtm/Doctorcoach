# Notification maintenance

The Site provides admin-only MCP tools `push_status` and
`dispatch_notifications`. Hosted Sites identity and the server's existing admin
allowlist authorize calls. Anonymous visitors and non-admin users cannot run
dispatch. No endpoint, health data, message text or individual identities are
returned by these tools. Discovery exposes tool descriptions only.

The intended cloud schedule is hourly in Asia/Jerusalem. Each run calls
`push_status`, then `dispatch_notifications` if configured. It scans a rotating
page of up to 50 devices and uses the same consent, category, quiet-hours,
deduplication and expired-device cleanup as updates triggered by app activity.
Routine runs do not publish source or change preferences. Provider acceptance
does not prove phone delivery. The schedule must be connected and exercised
through the hosted tool before claiming unattended operation is active.

Existing reminders include upcoming appointments within 24 hours, an unfinished
workout, the next-day follow-up, a pending weekly target and weekly summaries.
This is an hourly scan, not an exact-minute alarm or an invented workout schedule.

Team-message tests verify new message events even when unread counts stay the
same, consent withdrawal during computation, removed devices, duplicate dispatch
and quiet hours. Live team-message receipt still needs two linked accounts.

Device screenshots on 2026-10-11 confirm both test-provider submission and iPhone
banner receipt on the Home Screen after version 108. They do not verify every
reminder category or Android delivery.
