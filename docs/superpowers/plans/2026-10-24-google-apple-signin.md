# Google and Apple Sign-in Implementation Plan

> Use superpowers:executing-plans inline with test-driven development and a final independent review.

**Goal:** Add real server-side Google/Apple sign-in support to the existing LAB gateway, without misrepresenting unavailable provider configuration.
**Architecture:** A focused OAuth flow module, optional provider transport methods, the existing auth store for opaque sessions, and the existing localized sign-in page.
**Tech stack:** TypeScript, Supabase Auth PKCE, Cloudflare Worker/D1, Node tests, Chrome acceptance.
**Spec:** ../specs/2026-10-24-google-apple-signin.md

## Constraints and review focus
- LAB only; never weaken identity/session validation or merge accounts by email.
- Cross-site callback needs a Lax flow cookie; application session remains Strict.
- Expiry, browser mismatch, code replay, provider cancellation/outage and unsafe return URLs must fail closed.
- Disabled providers remain unavailable; missing credentials are an activation blocker, not a successful connection.
- OTP and explicit registration must remain usable in Hebrew/English and on mobile.

## Tasks
1. Write failing tests in tests/standalone-oauth.test.mjs and extend tests/supabase-identity.test.mjs for opt-in OAuth AMR verification.
2. Implement standalone/oauth.ts, provider transport, store acceptance and gateway routes; run auth/security regressions.
3. Add localized availability-aware buttons and browser acceptance for enabled/disabled flows and keyboard behavior; preserve CSP and OTP.
4. Run full tests, typecheck, standalone LAB build and independent review. Commit/push a new feature branch.
5. Configure providers only with valid owner-managed credentials and required confirmation; deploy and verify LAB if possible, otherwise document the exact activation blocker and a reviewable setup handoff.
