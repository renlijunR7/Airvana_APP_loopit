# Airvana Airdrop R7 v59 — Kai-only public preview

Status: **DEMO / local preview only**. This directory is not evidence of a production release, Live2D licence approval, Kai model authorization, campaign approval, reward settlement, or legal approval.

## Public package scope

- Default presenter: Kai.
- Renderer: existing full-body Kai sprite plus the registered whole-face viseme sheet.
- Presenter modes exposed in Tweaks: identity-safe hybrid and the earlier half-body face rig.
- The authorized Kai Cubism resource slot remains `BLOCKED`; the page immediately uses the Kai sprite fallback.
- Live2D Cubism Core, Mao `moc3`, Mao textures/motions, and the Cubism SDK download archive are not included.

The Live2D SDK manual states that Cubism Core is not published on GitHub under its proprietary licence. See [Cubism SDK for Web](https://docs.live2d.com/en/cubism-sdk-manual/cubism-sdk-for-web/) and the [SDK Release License](https://www.live2d.com/en/sdk/license/).

## Contents

- `demo/Airvana_Airdrop_Game_Offline_v59_KaiOnlyPublicPreview.html`: Kai-only browser preview.
- `demo/Kai_FaceOverlay_Visemes_v5.png`: external six-frame Kai face sheet used during answers.
- `demo/cubism-kai-runtime/Resources/Kai/RESOURCE_SLOT.json`: explicit authorization gate; currently `BLOCKED / PENDING`.
- `artifacts/v59-kai-only-public-preview-playable-config.json`: draft preview configuration.
- `artifacts/v59-kai-only-public-preview-adapter.json`: identity-safe renderer contract.
- `artifacts/v59-kai-only-public-preview-QA.md`: verified public-package QA record.
- `artifacts/v59-kai-only-public-preview-build-manifest.yaml`: file hashes, status, exclusions, and release blockers.

## Run locally

From `demo/`:

```bash
python3 -m http.server 8136 --bind 127.0.0.1
```

Open:

```text
http://127.0.0.1:8136/Airvana_Airdrop_Game_Offline_v59_KaiOnlyPublicPreview.html
```

Use HTTP rather than `file://` so the Kai authorization slot and face sheet follow the same-origin checks used by the host.

## Verified behavior

- New page load starts with Kai, Command Hub, and `hybrid` renderer mode.
- The Kai authorization gate returns `BLOCKED / PENDING`, so no formal Cubism renderer is claimed.
- The fallback face sheet returns HTTP 200 and cycles through mouth, rest, blink, and vowel frames while answering.
- The public page makes no Mao runtime, Mao asset, or Cubism Core request.
- The 430 × 932 test viewport has no page-level horizontal overflow.

## Release boundaries

- The Kai fallback is not a `.moc3` model and must not be described as formal Live2D.
- Do not change `RESOURCE_SLOT.json` to `AUTHORIZED` without a reviewed Kai model bundle, asset hashes, model/likeness rights, and approval evidence.
- Production release still requires the applicable Live2D publication decision, an approved Campaign Brief → Campaign Contract, target-device QA, privacy review, and a server-authoritative campaign/attribution integration.
- No production credentials, wallet settlement, KYC document collection, real reward issuance, or production CTA is included.
