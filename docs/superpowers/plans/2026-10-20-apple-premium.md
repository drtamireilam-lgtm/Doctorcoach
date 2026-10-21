# Apple Premium implementation plan

Goal: apply the user-approved Apple Premium brief to the existing full application and deploy only to isolated LAB when authenticated access permits.

Architecture: retain the existing ThemeProvider, owner/version-checked D1 API, 13 presets and navigation. Extend generated semantic tokens and add one last-loaded shared stylesheet, rather than independent page themes. Replace circular preset swatches with decorative miniature app layouts. Preserve stored custom colors exactly.

Global constraints: no Production, destructive migrations, data mutations or permission changes. No fake clinical/training data. RTL/LTR, keyboard focus, reduced motion and mobile safe areas required. Work from d86383d (latest Liad follow-up); preferred lab-team-management is behind.

1. Baseline: run root tests/build and standalone tests/typecheck; inspect CI and Cloudflare authentication.
2. Tokens: test derived raised/input/nav/chart tokens and foreground contrast across all presets and extreme custom colors; implement in lib/advanced-theme.ts without changing saved appearance values.
3. Shared surfaces: app/apple-premium.css, imported last in app/layout.tsx; layer shell, primary workflow panel, cards, grouped lists, buttons, form fields, tabs, dialogs, dropdowns, tables and charts. Use logical properties and existing classes/data slots.
4. Picker: render miniature canvas/navigation/card/button/text with per-preset tokens; keep exact immediate save handler and honest sync status. Test labels, selection, disabled state and all 13 save handlers.
5. Verify: full tests/typecheck/lint/isolated production build and built HTTP owner/theme/role/workout regression. Attempt actual browser QA; report unavailable device checks explicitly.
6. Review diff, commit, push dedicated branch and open PR. Inspect CI. Deploy only with authenticated Cloudflare access and verified existing LAB bindings; otherwise record exact blocker and leave Production unchanged.

Review focus: arbitrary custom contrast; selected vs successfully saved state; keyboard/mobile dialogs; long Hebrew/English labels; account switch must not leak appearance.

Authorization: the user supplied the full design brief, selected Apple Premium and explicitly requested autonomous implementation without repeated design approvals.
