# Character consistency v1 QA

Status: pilot implementation verification passed.

Verified evidence:

- Campaign Contract passed the Airvana schema validator.
- Airvana structural verification passed all 29 checks.
- Five canonical masters, five character contracts and five covers exist.
- Every pilot cover is generated from the same canonical vector master used by the character runtime; nested external SVG images are not used.
- Character runtime loads before `complete-games-v3.js`.
- The affected automated suites passed 140 of 140 tests, including lifecycle coverage for all 32 complete-game runtimes.
- Home and Discover map exactly five pilots to `character-consistency-v1`; 33 feed games remain on the previous cover package.
- In the in-app iOS preview, Moonlight Tea Shop displayed Mina Vale on both the feed cover and the playable Canvas (`360 x 560`).
- Mobile checks at 360, 390 and 430 px showed no horizontal overflow, missing pilot cover or console warning/error.
- The previous deterministic Canvas character remains the fallback when a canonical asset is unavailable.

Known repository-level issue:

- The complete `npm test` command currently stalls in the existing `test/api.test.mjs` pending-promise harness after the Android tests. This is outside the character-consistency changes; the scoped 140-test run and structural verification both pass.
