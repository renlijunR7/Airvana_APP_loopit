# Airvana Mao single-rig Cubism runtime

Build ID: `v57-mao-single-rig-runtime`

This is an isolated Cubism SDK for Web 5-r.5 runtime for the **official Mao
Free Material sample**. Its visible identity remains:

> Official sample Mao · not Kai

It is a local technical integration preview. Mao must not be presented as Kai,
a Kai clone, a KOL digital twin, or evidence that an authorized Kai `moc3`
exists.

## Single-rig topology

The runtime renders exactly:

- one `Mao.moc3` through one `LAppModel` instance;
- one WebGL canvas;
- zero face, head, neck, or body raster-overlay layers.

The ready gate counts the live model instances, canvases and raster-overlay
elements before sending `airvana:cubism-ready`. A mismatch emits
`single-rig-topology-invalid` and no ready message.

Mao has a compiled `PartNeck`, but **no independent neck parameter**. It would
be false to claim a `ParamNeck` control or a conventional parented part
skeleton. The truthful neck contract is `shared-deformer-graph`: the same
verified moc3 deformation graph responds across face, neck, clothing, legs and
arms.

Before the first frame, the runtime temporarily probes the actual loaded model
at its real parameter ranges, compares drawable vertices with epsilon `1e-5`,
and restores every parameter. `headNeckBodyCoupled` is enabled only when:

- `ParamAngleX/Y/Z` produce real face deformation;
- `ParamBodyAngleX/Y/Z` deform the face, all compiled neck drawables, robe,
  hoodie, leg and all four authored arm-part sets;
- `ParamBreath` exists and produces a real drawable response;
- all declared head, body, shoulder, arm and hand parameters exist in the
  loaded moc3;
- no explicit neck parameter exists.

## Continuous shared driver

`src/maosinglerigdriver.ts` adds one slow, continuous signal across the actual
Mao head, body, breathing, shoulder, arm and hand parameters. It uses
exponential damping and small amplitudes. The driver runs after authored motion,
expression, look, pose and physics updates and uses additive parameter offsets.
Those offsets are applied after the model saves its authored motion state, so
they do not accumulate or replace original motion curves. Reduced-motion input
scales the shared signal to 22% while keeping it continuous.

The gated parameter contract is:

```text
head: ParamAngleX, ParamAngleY, ParamAngleZ
body: ParamBodyAngleX, ParamBodyAngleY, ParamBodyAngleZ, ParamBreath,
      ParamLeftShoulderUp, ParamRightShoulderUp
arms: ParamArmLA01/02/03, ParamHandLA, ParamArmRA01/02/03, ParamHandRA,
      ParamArmLB01/02/03, ParamHandLB,
      ParamArmRB01/02/02Y/03, ParamHandRB
neck: shared-deformer-graph; explicitNeckParameter=false
```

## Verified resources and identity boundary

The Mao model resources remain byte-identical to the v56 source extracted from:

`CubismSdkForWeb-5-r.5.zip/CubismSdkForWeb-5-r.5/Samples/Resources/Mao/`

The resource gate verifies the fixed `Resources/Mao/Mao.model3.json` route,
the not-Kai identity role, `Mao.asset-manifest.json`, every referenced asset
SHA-256, the authored model3 groups, the audited CDI parameter/part profile,
and the single-rig contract in `RESOURCE_SLOT.json`. Cubism is not initialized
when this preflight fails.

Key unchanged hashes:

- `Mao.model3.json`: `d5fb29f93ef3cf3eba96b5aa9538eca063abbebee81a8d2dbeecea0cef4fecba`
- `Mao.moc3`: `ad5195b39e35e0da8ba0c825ad9cc2d60571502007f6f7d4f00963b768bb90d8`
- texture: `0b97283d69e62d346bcca25f8a91a5dd477f2e668ad9801b15fa7f108631c624`
- asset manifest: `76b41ae8b98012df6bcddf71a1bcdad50039de201f4d7e1b242e4f25f1b2707a`

## Host bridge and ready payload

The runtime accepts version-1 `airvana:cubism-state` messages only from its
exact parent window and same origin. Existing mouth, speech progress, answer
intent and state behavior remains supported. `reducedMotion` is also accepted
as a boolean.

Only after verified resources, model load, the live deformation-response probe,
topology checks and an error-free WebGL frame does the runtime send:

```json
{
  "source": "airvana-cubism-runtime",
  "version": 1,
  "type": "airvana:cubism-ready",
  "payload": {
    "modelId": "mao",
    "role": "official-free-material-sample",
    "firstFrame": true,
    "capabilities": {
      "moc3": true,
      "mouthOpen": true,
      "eyeBlink": true,
      "stateGestures": true,
      "singleModelRig": true,
      "headNeckBodyCoupled": true
    },
    "rig": {
      "mode": "single-moc3",
      "modelInstances": 1,
      "canvasCount": 1,
      "overlayLayers": 0,
      "headParameters": ["ParamAngleX", "ParamAngleY", "ParamAngleZ"],
      "bodyParameters": ["ParamBodyAngleX", "ParamBodyAngleY", "ParamBodyAngleZ", "ParamBreath", "ParamLeftShoulderUp", "ParamRightShoulderUp"],
      "armParameters": ["ParamArmLA01", "ParamArmLA02", "ParamArmLA03", "ParamHandLA", "ParamArmRA01", "ParamArmRA02", "ParamArmRA03", "ParamHandRA", "ParamArmLB01", "ParamArmLB02", "ParamArmLB03", "ParamHandLB", "ParamArmRB01", "ParamArmRB02", "ParamArmRB02Y", "ParamArmRB03", "ParamHandRB"],
      "neckMode": "shared-deformer-graph",
      "explicitNeckParameter": false
    }
  }
}
```

## Build and QA

```bash
npm run test
npm run build:prod
npm run qa:build
```

The generated runtime is `dist/`. `qa-host.html` is the browser bridge harness;
it checks the exact ready contract, one-model/one-canvas/zero-overlay topology,
the live response-probe flag, continuous rig frames and the host mouth/state
bridge.

## Licensing and release boundary

- Local technical preview: **AVAILABLE after the runtime gates pass**.
- Licensing review: **BLOCKED**.
- Production release: **BLOCKED**.
- Campaign approval: **BLOCKED / not asserted**.

The unmodified SDK, Framework, Core and NOTICE texts remain under `legal/` in
the built artifact. Local technical success does not prove acceptance of the
Live2D Free Material/sample-model terms, resolve attribution obligations, or
grant a Cubism SDK Release License.
