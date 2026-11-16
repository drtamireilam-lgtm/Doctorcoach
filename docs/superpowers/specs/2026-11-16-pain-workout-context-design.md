# Private pain reports in workout context

Owner requests autonomous implementation while travelling; no manual device or login work required from owner now. Complete the previously prepared pain-map mission in Work. LAB only.

Use an inline, closable report panel within pre-start, active exercise, finish and saved/history workout views. This avoids navigating away from workout/finish editors and keeps their drafts mounted. Guard closure of an unsaved pain draft; pain remains optional and never changes workout pain scores or gates starting/finishing. Before session creation, leave session reference absent; never guess or later auto-attach.

Extend existing append-only JSON records compatibly with optional sessionId/occurrenceId and server-derived exercise name snapshots; add during timing. Validate session ownership, noncancelled status, exact exercise occurrence and current snapshot in final SQL. Resolve nonbuiltins from owned/published custom definitions, current readable program snapshots or the explicitly referenced own workout snapshot. Repeat source authorization/content guards atomically. No schema change.

Provide a consent-guarded owner catalog endpoint under the existing pain API. Include builtins, personal/public custom definitions and current assigned/self program snapshots. Capture history names from server, not supplied labels; retain them after rename/removal without granting access elsewhere. All private context stays in memory/protected requests, not URLs/storage/telemetry. Account changes/consent withdrawal clear/hide private state as in the existing implementation.

History must display the historical marker's reference rather than a different draft reference and refuse plotting coordinates from another geometry version. No clinical sharing or diagnosis. Native iPhone/Safari remains explicitly unverified without a real device.
