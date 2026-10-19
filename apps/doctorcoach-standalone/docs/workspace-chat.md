# Private workspace conversations

Each conversation belongs to one workspace and one trainee. Only that workspace's authenticated owner and the trainee participate; the clinic's staff/admin roles do not grant access. Coach read/write and trainee writes require active membership, active license and current shared-data consents. Trainees retain read-only access to their own previous transcripts after archive, license expiry or revocation. No clinic message/document table is read or modified by the chat API.

The server supplies author identity/name/role. Request UUIDs make retries idempotent; reuse with different content or another scope is rejected. Messages are plain text up to 4,000 characters, rendered through React text nodes. Loads return 50 chronological messages with a scoped sequence cursor for older pages. Read watermarks use an existing scoped message ID and advance monotonically for the authenticated viewer only. A later arriving message remains unread.

The portal shows unread counts on coach client cards and trainee membership cards. The conversation loads on first opening, preserves a composer draft when collapsed, refreshes every 30 seconds while open and the document is visible, and retains input/request ID after network failure. Sending and marking read are explicit actions. Push/email delivery and file attachments are not part of this version.

Migration 0035 adds workspace_messages and workspace_chat_reads. Trainee data export and deletion include both tables. The existing clinic messaging feature is unchanged. Browser QA is unavailable; integration tests cover participants, boundaries, trusted authors, retries, pagination, watermarks, archive/expiry/consent and read/write races.
