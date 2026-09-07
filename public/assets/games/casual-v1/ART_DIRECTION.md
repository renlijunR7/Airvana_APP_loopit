# Casual v1 — independent game worlds

This pack follows the user's supplied mobile-game screenshot as a **rendering-style reference**: polished, dimensional, hand-painted 2.5D casual-game art with controlled lighting, clear silhouettes and readable playfields. It does not copy the screenshot's characters, interface, train or branded artwork.

The user explicitly rejected both the earlier flat-vector interpretation and the proposal to reuse eight themed environments. The active contract is therefore:

- Each of the 38 catalog games has its own independent source at `environments/{gameKey}.png`.
- Every source background has a different SHA-256 checksum. The same is required of the 38 runtime scene images.
- Worlds reflect the game's setting and mechanic: an orbital greenhouse is not an Earth orchard, a moon-spaceport toy boutique is not a tea café, and a neon runner lane is not a country-town racing road.
- Center playfields are kept clear; live characters, collectibles, controls and state are drawn by the game runtime, not baked into an environment poster.
- Gameplay objects come from the new 64 PNG sprite set. Import provenance, crop bounds, hashes and alpha processing are recorded in `sprites/manifest.json`.
- Old generic environment drafts may remain as archival, unmapped files. The builder never uses them as a fallback, and only per-game filenames enter the active manifest.

## Build and verification

`scripts/build-casual-scenes-v1.mjs` packages the approved environment raster and new transparent PNG game objects into 720 × 1120 assets:

- 38 WebP scenes;
- 38 WebP game-layout covers;
- 38 PNG covers for Flutter's existing image loader.

It mirrors all runtime images and manifests into the Flutter runner assets. It fails on missing sources, duplicate worlds, missing sprites, or opaque/fake-transparent sprite files. `--scenes-only` is an explicitly incomplete interim build, reported as `scenes-ready-covers-pending`; it is not the full delivery state.

`test/casual-scenes-v1.test.mjs` verifies identity preservation, distinct source worlds, truthful provenance, prompt records, checksums, formats, dimensions, Web/Flutter mirrors, and the complete 114-image output set. Static `preview-*.html` contact sheets support visual inspection without inline JavaScript.

## Source and release boundary

Artwork was created with the built-in ImageGen tool and assembled with a deterministic game-asset packaging step. Generation and import provenance are recorded honestly; “removing the AI-looking style” is not a claim that no generative tool was used. Existing source generations and previous asset versions are preserved. This is a user-requested local preview asset update, not an external production release or a claim of rights to third-party game IP.
