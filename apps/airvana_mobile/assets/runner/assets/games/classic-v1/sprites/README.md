# Classic 2D gameplay sprites

64 original, editable game-object drawings replace the previous generated raster atlases in the current runtime. Each semantic key has its own 64 × 64 SVG. The complete project-specific key map and Canvas/DOM API remain unchanged.

## Art direction

Limited flat colors, dark outlines, readable silhouettes, and 2–3 color planes reference the visual grammar of classic arcade, tile-puzzle, and adventure games. There are no atmospheric lighting effects, glossy material rendering, gradients, filters, raster images, emoji, or external image references. Characters have complete bodies and poses; props are drawn as gameplay objects rather than generic UI icon glyphs.

These are original repo-native path definitions made for this project. No named classic game's characters, screens, or asset files have been copied. “Classic” describes the design direction, not asset provenance. Source-based construction is not a claim of human authorship or a new third-party license.

## Runtime

- Global: `AirvanaPlayableAssetsV3`, version `4.0.0`, pack `classic-v1`.
- `get(key)` returns an individual SVG URL, `css(key)` uses center/contain, and `draw()` preserves aspect ratio and supports alpha, rotation, and flip.
- Failed assets are reported by key; no previous AI-image atlas is loaded as fallback.
- Flutter copies are byte-identical to web sources.
- `manifest.json` records every file's byte count and SHA-256 checksum.
- Open `contact-sheet.html` to inspect all 64 gameplay objects together.

Old atlases are retained in their original versioned directories for historical-artifact integrity, but this runtime has no references to them.
