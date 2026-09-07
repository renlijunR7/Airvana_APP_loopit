# Casual 2.5D gameplay sprites

64 new painted, rounded game-object sprites follow the user's bright farm-game reference. The runtime uses individual real-alpha PNGs and retains all existing semantic keys and gameplay bindings.

## Provenance and processing

All four 4×4 source sheets were generated using the built-in ImageGen tool with the user image as a style reference only. No character, screenshot, train, brand mark, or UI was copied from that reference. Full original prompts, source paths, checksums, and history are recorded in `manifest.json` and `../sources/sprites/build-config.json`.

The generation tool produced RGB sheets with a painted checkerboard instead of genuine alpha. A targeted native alpha edit was also RGB; that unsuccessful output is retained and explicitly recorded. ImageGen then changed only the backdrop to a uniform magenta matte. The game import pipeline uses deterministic color-key alpha extraction, one-pixel boundary color unmixing, reviewed cell bounds, and transparent-margin cropping. This is accurately recorded as imported alpha, not generator-provided alpha. Invisible RGB values are zeroed to prevent texture-fringe artifacts. No drawing, shape regeneration, model/API switch, or legacy-art fallback occurs in the importer.

All original source PNGs, failed-alpha attempt, final matte PNGs and full prompts are retained under `../sources/sprites/`. The Flutter sprite and source copies match byte for byte.

## Runtime

- `AirvanaPlayableAssetsV3` version `5.0.0`, pack `casual-v1`.
- `draw()` uses natural object proportions; `get()` reports real source width and height.
- 64 PNG keys serve all 38 existing game mappings.
- The previous classic vector set remains archived and is not used as a fallback.
- `contact-sheet.html` renders all 64 objects on both grass-green and slate backgrounds for edge and subject checks.

Validation: real RGBA data, substantial opaque foreground, transparent padding, no opaque magenta remnants, fruit/gem center integrity, source/runtime checksums, web/Flutter parity, and loader/drawing behavior. Browser composition was reviewed in an isolated Playwright session on green and dark backgrounds; no clipped subjects, visible matte residue, or missing sprites were observed.
