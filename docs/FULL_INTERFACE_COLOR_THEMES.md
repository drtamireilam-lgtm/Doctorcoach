# Whole-interface color themes — 2026-10-18

Branch: feature/full-interface-color-themes. Base: feature/standalone-email-auth-v171-20261015 (fcb2ae3). This targets the standalone DoctorCoach application, not the isolated anatomy prototype or the older root MVP accent-only selector. No deployment, Production change or merge performed.

## User behavior

The existing ThemeToggle, used in the header, account appearance settings and account-deletion page, now opens the same seven-theme picker: classic dark, classic light, ocean blue, violet, ruby red, sunshine yellow and forest green. Themes recolor the page background, cards, sidebar, navigation, inputs and action buttons. Existing light/dark stored choices remain compatible. Preferences use the existing `doctorcoach-theme` browser storage key through next-themes; they are device-local, not account-synced. Invalid saved values recover to dark. Theme browser-chrome metadata tracks the chosen background. Palette changes do not touch records, workouts, access control or database settings.

The panel offers named previews and aria-pressed selections, Escape/close/outside-click dismissal, focus restoration for keyboard close, 44px controls and a bounded mobile panel. It is a non-modal popover; Tab remains native. No browser interaction verification was available in this environment.

## Implementation

- `lib/color-themes.ts`: canonical theme IDs and preview/color tokens.
- `components/theme-provider.tsx`: next-themes integration, persisted selection and accessible picker, replacing the two-mode toggle.
- `app/full-color-themes.css`: explicit full-surface palettes and screen coverage; no blanket filters, image recoloring or destructive global color replacement. Clinical warning/error/success styles are independent from decorative palettes. Photos, video and anatomy imagery retain original colors. Print neutralizes decorative backgrounds.
- `app/layout.tsx`: imports full palettes after the existing design styles.

## Validation

Dependency install from existing pnpm lockfile passed with no package changes. TypeScript passed. Full application suite: 1,084 passed, 0 failed (includes three new color-theme tests). Build passed. Final rebuild repeated after outside-click handling and semantic-heading color refinements. `git diff --check` passed.

Tests verify unique supported themes, legacy IDs/fallback, custom palette CSS/data consistency and WCAG text contrast >=4.5:1 for defined text and muted-text tokens against canvas/card/raised/soft surfaces, plus action-button label contrast. These calculations validate only token pairs, not every existing hardcoded element, visual state or whole-page WCAG compliance. Dark/light existing styling is retained.

Browser/mobile screenshot QA remains pending because the required managed browser skill is unavailable. Before deployment: check the seven themes on home, account settings, workout, exercise library, learning and clinical alerts; verify mobile popover placement, refresh persistence, Escape/outside click, multiple picker instances, images and printing. No screenshots or real-device performance results are claimed.
