# Asset provenance

## Contestant portraits

- `assets/contestants-contact-sheet.png` is the original 1536×1024 contact sheet generated with OpenAI ImageGen specifically for this game-replica task.
- `assets/player-1.webp` through `assets/player-6.webp` are deterministic, lossless 498×498 WebP crops from that contact sheet, ordered left-to-right and then top-to-bottom.
- The portraits depict fictional, AI-generated contestants. No logo, trademark graphic, or real-person portrait from the referenced SUD webpage was directly copied into these assets.
- The supplied webpage screenshot was used only as a visual reference and is not redistributed in this asset set.

### Crop coordinates

Coordinates use the source image's top-left corner as `(0, 0)` and are listed as `x, y, width, height`.

| File | Crop |
| --- | --- |
| `player-1.webp` | `10, 9, 498, 498` |
| `player-2.webp` | `519, 9, 498, 498` |
| `player-3.webp` | `1028, 9, 498, 498` |
| `player-4.webp` | `10, 515, 498, 498` |
| `player-5.webp` | `519, 515, 498, 498` |
| `player-6.webp` | `1028, 515, 498, 498` |

The crop boxes remove the contact sheet's outer whitespace and internal white dividers without generative repainting.

## Generation mode and final prompt

Mode: Codex built-in ImageGen (`stylized-concept`), generated once as a project-bound bitmap asset.

```text
Use case: stylized-concept
Asset type: game character portrait contact sheet for a mobile spectator prediction game
Primary request: create six distinct fictional adult livestream game contestants, presented as six separate polished avatar portraits in a precise 3 columns by 2 rows grid
Scene/backdrop: each cell has a simple unique jewel-tone studio gradient background, clean separation gutters between cells
Subject: six diverse East Asian adult contestants, three women and three men, friendly competitive expressions, varied hairstyles and outfits, head-and-shoulders framing, no real people and no celebrity resemblance
Style/medium: high-end stylized 3D game portrait illustration with soft cinematic lighting, crisp facial features, premium casual mobile game art
Composition/framing: perfectly aligned 3x2 contact sheet, every face centered at the same scale, generous crop-safe margins, no overlap between cells
Color palette: emerald, violet, amber, coral, sapphire and teal accents
Constraints: adults only; exactly six portraits; no text; no letters; no numbers; no logos; no trademarks; no watermark; no interface mockup; no playing cards; each cell must be usable as a square avatar crop
```
