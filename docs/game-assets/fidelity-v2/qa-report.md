# Fidelity v2 QA Report

Status: technical review passed for `LOCAL_DEMO`; human brand/release approval remains pending.

## Scope

- 38 source PNG files at 941 × 1672.
- 38 optimized JPEG runtime files.
- Web art registry v4.0.0.
- Flutter local runner copies for offline iOS/Android WebView use.
- 32 `complete-games-v3` v3.7.0 and 6 `deep-games-v2` v2.3.0 gameplay engines.
- Runtime inspection now exposes the loaded art pack, three-stage contract, and the full `intro / playing / paused / success / failure / retry` state set for every game.

## Release boundary

This asset pack is `LOCAL_DEMO`. External or production release is blocked until human brand/release approval. No reward, CTA, wallet, entitlement, settlement, or Campaign Contract authority was changed.

## Completed checks

- Asset integrity: 38/38 source PNG and 38/38 runtime JPEG files are 941 × 1672; file presence, SHA-256, Web/Flutter copies and uniqueness passed.
- Visual review: four browser contact sheets covered all 38 scenes. Each scene is distinct, mechanic-relevant and free of visible text, logos and watermarks.
- Browser runtime: Playwright waited for the actual completion state; 38/38 engines mounted and rendered, all 12 art families were sampled, and the final console contained 0 errors and 0 warnings.
- Node scoped regression: 198/198 passed for game runtimes, art manifests, frontend/mobile contracts, sensors and iOS shell.
- Structural verification: 30/30 passed.
- Flutter static analysis: no issues found.
- Flutter test suite: 115/115 passed.

## Runtime integration update — 2026-09-05

- The red-box gameplay surface in the home feed now identifies itself as a high-fidelity three-stage interactive scene.
- All 38 runtime definitions resolve to `fidelity-v2`; validation preloads the 38 scenes and all 12 sprite atlases before checking rendered pixels.
- Browser runtime validation passed 38/38 with the final status: `保真素材已加载 · 完整状态集已验证`.
- Responsive browser QA passed at 360 × 800, 390 × 844 and 430 × 932 with no horizontal overflow; the canvas remained inside the viewport at all three sizes.
- Current scoped Node regression passed 117/117; structural verification passed 30/30; Flutter analysis reported no issues; Flutter tests passed 115/115.

## Known repository-wide issue

The repository-wide `npm test` command was stopped after `test/api.test.mjs` left a Promise pending for about 264 seconds. At that point 15 tests had passed and later files were cancelled by the interruption. This pre-existing asynchronous test-runner blockage is outside the art-pack path; the isolated 198-test regression above completed with zero failures.

## Not verified

- Physical iPhone/Android sensor and memory-performance run with this larger asset bundle.
- Human brand approval or external/production release approval.
