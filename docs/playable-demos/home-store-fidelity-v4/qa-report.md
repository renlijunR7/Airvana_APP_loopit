# QA report

Status: passed for local DEMO integration on 2026-08-15. External commercial release still requires human art and rights review.

## Results

- Asset manifest: 38/38 JPEG files, 720×1280 each, 7,463,209 bytes total, SHA-256 recorded per file.
- Browser: Home loaded `orchard-merge.jpg` at natural size 720×1280 with the title overlay inside the darker lower-safe zone.
- Browser: Discover resolved all 38 v4 image elements; every visible element reported `complete=true` and natural size 720×1280.
- Responsive visual checks: 360×800, 390×844 and 430×932 viewport overrides retained subject readability and usable title/action overlays.
- HTTP proof: representative v4 asset returned `200` from `http://127.0.0.1:8082/`.
- Automated tests: 136 passed, 0 failed across frontend contract, mobile behavior and complete-game runtime suites.
- Structural verification: `npm run verify` passed all 29 checks.
- Contract schema: `campaign-contract.json` passed the Airvana campaign-contract validator.
- Runtime boundary: gameplay, input, CTA, reward, wallet, attribution, settlement and data-policy contracts were not expanded by this visual revision.

## Human review boundary

- Representative visual inspection covered cozy merge, survival, fashion, cyber safety, farming, music, postal sorting, card tactics, hex strategy, idiom detective, garden restoration and microbe arena categories.
- The application market informed genre readability only. No third-party screenshot, logo, character, interface or branded asset is bundled.
