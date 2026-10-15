# Scoped source read-path inventory

Reconciled against current production source, not the separate Vite prototype.
This is not a complete security assessment or live/browser verification.

| Read group | Existing boundary / focused coverage |
| --- | --- |
| Staff dashboard | Final role/client/grant/thread checks |
| Care and wellness bundles | Final role/connection/used grants; wellness sharing |
| Team, client and roster lists | SQL role and final role/client checks |
| Conversations and summaries | Channel scope/grants, final response checks |
| Media listings and download | Role/links/assets; check after storage retrieval |
| Coordinator appointment management | Role and all captured client scopes |
| Notifications | Current consent and unread permissions in final SQL |
| Clinical content review | Clinician SQL and final role check |
| Public/management stories | Final consent/publication/version; stale cache clearing |
| Favorites, logs, privacy/export | Server owner identity filters; history retained |
| Membership/services/general feedback admin | Configured administrator allowlists |
| Program/access reads | Server owner filters; inspect mutations separately |

During this reconciliation, the legacy log write was found and reproduced as a
separate persistence gap, then fixed. Legacy program mutations were subsequently
reproduced and guarded. Next reconcile workout start/retry/set consent policy
before assigning another confirmed defect.

Outstanding: actual trainee/staff journeys, mobile/desktop layout, live D1/R2,
payment-provider verification, and broader independent review. Existing focused
tests do not establish that every possible interleaving or endpoint is safe.
