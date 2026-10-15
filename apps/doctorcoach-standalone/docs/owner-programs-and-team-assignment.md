# Owner programs and targeted coaching assignments

The server derives `ownerProgramEmails` from the intersection of configured
administrator and clinician emails. The physician-owner can edit private drafts,
review, import and publish training programs for linked clients without changing
the physician role. Other clinicians, dietitians and coordinators do not gain this
capability. Connections, current staff status, intake, consent, medical blocking,
active-workout and version guards remain enforced at write time.

Owner-authored programs use the same runtime author guard across plan access,
workout start and set writes, and membership/pilot access summaries. Disabling the
staff row, removing the configured owner, or revoking the client link removes
access. Existing workouts retain snapshots and may still be finished/cancelled.

In a linked client file, the owner can select active coaches and create an invitation
bound to that client's account. It grants no access until the client accepts the
named team and permissions. Other accounts cannot preview or consume it. The owner
is included in the consent preview; any new medical grant therefore remains explicit.
Only the selected client's sharing changes; existing assignments remain and no
program is replaced merely by accepting the invitation. Codes are displayed for
manual handoff and no messages are sent. This is an additional assignment workflow,
not reassignment/removal of an existing coach.
