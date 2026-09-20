# Mao iframe projection safety patch

This package contains only the generated Cubism runtime bundle and its historical
source map; the TypeScript build source is not shipped here. The generated bundle
therefore carries one localized runtime patch, and its stale `sourceMappingURL`
comment is intentionally removed.

The corresponding source-level change belongs in
`src/lapplive2dmanager.ts`, inside `LAppLive2DManager.onUpdate()` before the
generic aspect-ratio branch:

```ts
const maoInnerScale = 0.44;
const maoTranslateY = 0.301;

if (LAppDefine.IsMaoModel) {
  projection.scale(
    (height / width) * maoInnerScale,
    maoInnerScale
  );
  projection.translateY(maoTranslateY);
} else if (model.getModel().getCanvasWidth() > 1.0 && width < height) {
  model.getModelMatrix().setWidth(2.0);
  projection.scale(1.0, width / height);
} else {
  projection.scale(height / width, 1.0);
}
```

The fixed uniform scale and translation run for Mao at every viewport aspect
ratio. They create stable room for the broom, hands, and all seven authored
motions before WebGL clips to the iframe framebuffer. Across those motions, the
union of dynamic-visible drawables with opacity above zero is approximately
`x = -0.971609..0.598562` and `y = -2.023884..1.072681` in model coordinates.
These are drawable-geometry bounds, so transparent texture margins can make
them more conservative than measured visible-pixel bounds.

With Mao's model-matrix scale, the values above map the vertical envelope to
approximately `top = 0.023609` and `bottom = 0.964375` in normalized framebuffer
coordinates. Horizontal normalization is aspect-dependent because the Mao
projection scales X by `height / width`: for a square viewport the envelope is
approximately `left = 0.204816` and `right = 0.681849`; for any other viewport,
multiply each signed offset from `0.5` by `height / width` before clamping.

All non-Mao models retain the original projection. Host-side framing may use a
fixed ordinary/special camera transition around this stable envelope; it must
not dynamically change the inner projection every animation frame.

## Dialogue motion policy

Mao's automatic dialogue state entries use only the three ordinary `TapBody`
motions: `mtn_02`, `mtn_03`, and `mtn_04`. The generated bundle expresses this
as the deterministic index cycle `[0, 1, 2]`. States such as answering,
speaking, acknowledging, and complete can therefore retain the host's portrait
camera instead of opening the full-effects camera during routine questions.

This does not remove authored content. `special_01`, `special_02`, and
`special_03` remain mapped to `TapBody` indices 3, 4, and 5, respectively. They
remain directly selectable through the Tweaks action preview and are also
preserved in `sequence_all`, together with all seven motions and all eight
expressions. Explicit special commands still use the full-effects camera and
the projection envelope documented above.

## Stable portrait camera with peripheral FX compression

`mao-fx-stage-transform.js` keeps Mao's body at the host portrait framing for
all seven motions. It classifies the 101 effect drawables by their authored
top-level part IDs (`Part`, `Part2`, `PartInk`, `PartSmoke`,
`PartExplosionLight`, `Partaura`, `PartLight`, and `PartHeart`). The remaining
159 body, clothing, face, arm, leg, and wand drawables are never transformed.

Immediately before `drawModel`, the runtime applies a fixed, monotonic spatial
warp only to those effect vertices. Points in the central model-space box
`x = -0.55..0.40`, `y = -0.60..0.60` stay byte-for-byte unchanged so effects
remain attached to Mao's hand and body. Only peripheral points are smoothly
compressed toward `x = -0.67..0.49`, `y = -0.758..0.723`. Opacity, draw order,
blend mode, texture, motion curves, and expression curves are not changed.
The original vertex buffers are restored in a `finally` block after every
draw, preventing cumulative deformation when Cubism reuses a vertex buffer.

The shipped Mao moc3 has 260 drawables, no offscreen surfaces, and no clipping
mask relationship crossing between those 101 effect drawables and the 159 body
drawables. The helper checks that boundary before enabling the warp; a future
moc3 with a cross-boundary mask fails closed and renders with its original
vertices. Runtime diagnostics are published through
`window.__MAO_FX_STAGE_CHECK__` and `html.dataset` for browser QA.

This preserves every authored action and effect, but it necessarily compresses
the shape of very tall peripheral light meshes. A production re-export from
Cubism Editor with the large FX authored directly inside the portrait safe area
would remain the preferred source-level solution.
