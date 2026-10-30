# Smart Import 3.1 — isolated follow-up, 2026-10-29

Base: PR60 d396b68. Dedicated branch codex/smart-import-31-20261029. User requests autonomous execution; detailed spec supplies scope and overrides design approval pauses. No deployments, main merges, DB commands, or writes to PR59/60.

Conflict audit: PR59 42a1f14 modifies program-import.ts, exercise-qualifiers.ts and reviewed-import-aliases.ts. These files and shared UI/runtime/CI are frozen here. PR53 supplies existing conservative literal/alias/token matcher, general variants and review-only fuzzy suggestions. PR60 supplies source-preserving local fallback. Reuse all of these; do not cherry-pick Work fixes or claim its real workbook evidence as our own.

1. Add failing tests for duplicate XLSX row/cell coordinates, inconsistent coordinates and invalid shared-string references. Fix only excel-workbook.ts to reject malformed data before silent overwrite/empty substitution.
2. Add representative bilingual recognition evaluation and 3-sheet/large workbook tests preserving merges, weights, RPE and structure. Audit existing CSV/text-PDF regressions; scanned OCR remains unsupported.
3. Benchmark repeated fuzzy review queries. If material, add bounded per-catalog review-result memoization only in exercise-matching.ts. Preserve scores/thresholds/statuses and clone returned results to prevent caller mutation. Do not edit qualifier/alias ownership files.
4. Run targeted tests, types, lint and build; report existing failures precisely. Recheck remote Work file list before commit. Create a separate draft stacked PR targeting PR60 with explicit integration dependencies, never modify PR60 itself.
