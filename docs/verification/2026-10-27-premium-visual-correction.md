# Premium Home visual correction

Continues deployed candidate 3ab24c07 on PR58; LAB only. Browser inspection of the live anonymous home showed a 76px desktop header and an oversized hero stretched alongside all three metric cards. The previous mobile CSS explicitly forced a two-row header plus 20px empty padding, and palette rules flattened all premium surfaces.

The home shell now uses a compact single-row mobile header with safe-area padding, retained account/language/theme/notification controls and no reserved empty status row. Home card spacing, headings, consultation copy, primary CTA, steps empty state and quick actions use coherent mobile proportions. Desktop hero and metrics share one grid row with bounded height. All persisted appearance tokens remain in use; subtle gradients and low-contrast borders restore depth for each chosen hue, including gold/silver. Mobile has no extra outer frame around its cards. No APIs, auth, schema, permissions, appointments, cardio or training logic changed.

Verified: TypeScript, isolated LAB build, all 1626 tests. Local browser smoke passes nine palettes x two modes x 320/390/1440 widths, plus gold/silver visual captures, no horizontal overflow/page errors, English direction/consultation navigation, mobile header <=80px and desktop hero <=390px. Gold/teal light/dark screenshots inspected. Browser injects production themeTokens output; persistence is unchanged and is not re-claimed as live verified.

Live deployment and fresh live visual measurements must be checked after Cloudflare auto-build. The user's screenshot alone cannot establish browser zoom or physical-device rendering; no zoom-related cause is claimed or forced. Native text scaling remains enabled.
