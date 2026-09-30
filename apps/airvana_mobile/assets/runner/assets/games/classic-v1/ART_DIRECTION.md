# Classic 2D visual direction

Scope: local Airvana game visual replacement requested by the user; no external publication.

- 38 original scene SVGs, 38 mechanic-specific covers and 64 original game-object SVGs.
- Limited palettes, solid fills, clear contours, tile-based scenery and readable game boards.
- No image-generation inputs, reused AI-rendered backgrounds, raster texture atlases, bloom, glass panels or photographic materials in the active classic pack.
- Existing game rules, legal input transitions, scoring and server authority remain separate from the visual layer.
- Old artwork and old content artifact versions remain archived for recovery; current game registrations select classic-v1 only.
- Flutter covers are deterministic PNG renders of these original SVG covers, not a separate source-art pack.

Reference direction (design conventions only, no third-party game art copied):

- [Stardew Valley official media](https://www.stardewvalley.net/media/): readable tiled scenery and restrained scene composition.
- [Tetris official play](https://play.tetris.com/): a clear primary board and minimal surrounding controls.
- [Kenney Tiny Dungeon](https://www.kenney.nl/assets/tiny-dungeon): compact, readable classic 2D game-object language. No Kenney files are bundled by this change.

Artwork is code-authored original project artwork, not represented as human-painted art or licensed assets from those games. See manifest.json and sprites/manifest.json for provenance and checksums.
