# Mao sample model notice

- Identity: **Official sample Mao · not Kai**
- Runtime role: `official-free-material-sample`
- Source archive: `CubismSdkForWeb-5-r.5.zip`
- Source directory: `CubismSdkForWeb-5-r.5/Samples/Resources/Mao/`
- Model file: `Resources/Mao/Mao.model3.json`
- Model resource manifest: `Resources/Mao/Mao.asset-manifest.json`

The v57 integration renders Mao through one `Mao.moc3`, one Cubism model
instance and one canvas, with no face/head/neck/body raster overlay. Mao has a
compiled `PartNeck` but no independent neck parameter; the runtime therefore
reports `neckMode: shared-deformer-graph` and
`explicitNeckParameter: false`. `headNeckBodyCoupled` is gated on an actual
pre-first-frame drawable-response probe and is not a claim of a conventional
parented part hierarchy.

The SDK package `LICENSE.md` identifies `Samples/Resources/Mao` as a model
available under the Live2D Free Material License and also points to the
Live2D sample model terms. Those terms, the Live2D Open Software License, the
Live2D Proprietary Software License for Cubism Core, and any applicable Cubism
SDK Release License remain controlling.

Official licence references are preserved in `legal/licenses/` in the built
artifact. This notice does not grant additional rights and does not authorize
renaming Mao, representing Mao as Kai, or using Mao as proof of Kai likeness
authorization.

Licensing review and production release remain `BLOCKED`.
