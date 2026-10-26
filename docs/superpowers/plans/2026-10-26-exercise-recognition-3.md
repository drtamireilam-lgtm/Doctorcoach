# Exercise Recognition 3.0 Implementation Plan

Goal: implement Issue #51 on the current import integration stack, preserving IDs and variant safety.
Architecture: additive literal bilingual dictionary, deterministic qualifier parsing and order-independent verified-token matching. Unverified spelling similarity remains review-only. Existing general-parent import policy from #49 takes precedence over the older issue's generic ambiguity wording.
Tech: TypeScript, node:test, existing XLSX/CSV/PDF parsers.

- [x] Add failing behavioral tests for new names, reordered qualifiers, conflicting equipment/angle/posture/laterality, normalization counts and report determinism.
- [x] Curate alias additions against catalog names/descriptions; never invent quota padding or promote corrections into the shared dictionary automatically.
- [x] Add conservative structured qualifier extraction and exact token multiset equivalence; conflicting or unknown extra tokens cannot auto-assign.
- [x] Generate reviewable complete per-ID alias CSV/JSON, collision and shortfall diagnostics. Count unique normalized aliases excluding canonical names and ID; distinguish composition equivalence from literal alias counts.
- [x] Run full tests, typecheck/build when dependencies permit, frozen evaluation and synthetic XLSX/CSV/text-PDF persistence regressions.
- [x] Review diff and create stacked PR against #50, with exact verified results and remaining shortfalls. Do not merge, deploy Production or write remote user data. Live LAB only if candidate and isolated test identities are available.

Review focus: token order must not hide qualifier changes; named unilateral movements must not become bilateral; unknown equipment and contradictory selectors must not map; dictionary collisions remain ambiguous; reports must not include user source files or metadata.

## Follow-up execution

- [x] Confirm parent exact-head CI passes.
- [x] Reuse five authorized real XLSX sources privately; report per-sheet development coverage and excluded non-table sheets.
- [x] Add six safely equivalent observed names and remove two overly general cable-triceps aliases.
- [x] Export review-only proposals from existing persisted personal correction memory, with explicit projection, token-collision flags and no shared-dictionary write.
- [x] Verify owner isolation, 250-entry bound, HE/EN component rendering and complete application suite.
- [x] Independent follow-up review; correct collision/provenance findings.

Remaining: 13 generic parent IDs below 15 meaningful alternatives; representative independently labeled evaluation; authenticated isolated LAB desktop/mobile acceptance; exact follow-up-head CI. No artificial quota padding.
