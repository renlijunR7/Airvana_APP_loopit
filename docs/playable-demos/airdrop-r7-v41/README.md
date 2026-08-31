# Airvana Airdrop R7 v41

Status: **DEMO / local preview only**. This directory is not evidence of a production release, campaign approval, reward settlement, or legal approval.

## Contents

- `demo/Airvana_Airdrop_Game_Offline_v41_FullBodyViseme.html`: self-contained offline preview.
- `source/`: source code, bundled browser dependencies, and local demo assets used by the template.
- `artifacts/v41-full-body-viseme-playable-config.json`: draft `PlayableConfig` for the preview.

## Run the standalone preview

From this directory:

```bash
python3 -m http.server 8133 --bind 127.0.0.1
```

Open:

```text
http://127.0.0.1:8133/demo/Airvana_Airdrop_Game_Offline_v41_FullBodyViseme.html
```

## Rebuild from source

```bash
cd source
node build_single_html.js
```

The build output is written to `source/output/Airvana_Airdrop_Game_Offline.html`.

## Verification record

- Artifact SHA-256: `587118e2a2ba418267ef65374c38336f27112c12541405df4f80bcc04913901b`
- Artifact size: `48,728,596` bytes
- `PlayableConfig` validation: passed with the Airvana payload validator
- Local HTTP preview: returned `200 OK` on 2026-08-31

## Known boundaries

- The avatar uses a local sprite/viseme simulation and browser speech capabilities; it is not a licensed production Live2D model or a production conversational digital human.
- The configuration status is `draft`, the environment is `preview`, and the CTA is disabled for this local demo.
- Full mobile functional, telemetry, accessibility, privacy, brand-rights, and regulated-campaign approval gates are not recorded as complete here.
- No production credentials, real reward issuance, wallet settlement, KYC collection, or production campaign publishing is included.
