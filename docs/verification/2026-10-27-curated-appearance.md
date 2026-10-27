# Curated medical appearance presets

User requested the missing navy/teal/champagne reference and additional calmer premium colors. Added five presets to the existing picker (18 total): medical-premium, ocean-slate, sage-stone, ivory-champagne and midnight-lavender. Existing default and stored choices are unchanged. New choices use the existing six-color custom appearance format, bilingual names, miniature previews, mode switch and owner-scoped persistence. No schema or permissions change.

Reference colors: canvas #0c1523, cards #1a2a3a, teal #8dcac8, champagne button #edce97. A readable home-action token separates champagne links/actions from teal icon accents. Other presets retain their button/accent roles through the same generic token.

Validation: new preset/contrast test failed before implementation; after implementation all 1627 standalone tests passed, including every named picker choice and disabled/anonymous states. TypeScript, isolated LAB build/target check passed. Browser matrix retained nine palettes in both modes at 320/390/1440, and added the five curated presets (plus gold/silver), with no horizontal overflow or page errors, direction/navigation and header/hero bounds. New reference and sage screenshots visually inspected. Built local Worker smoke saved/read every configured preset through owner-scoped HTTP preferences with synthetic accounts. No real account preference was changed by the agent.

Release: same PR58/branch, LAB-only automatic Cloudflare Builds. Verify new option names appear in live settings after rollout; physical-device and actual-user save/relogin remain unclaimed.
