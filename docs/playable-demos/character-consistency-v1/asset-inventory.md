# Character asset inventory v1

This inventory records the first five games migrated from independent cover/runtime art to one canonical character source.

| Game | Character | Canonical master | Cover | Runtime placement |
|---|---|---|---|---|
| 像素冒险 | Nova Runner | `chr_nova_runner/master.svg` | `pixel-quest.svg` | runner player avatar |
| 萌宠音乐盒 | Mochi Beat | `chr_mochi_beat/master.svg` | `paws-stage.svg` | four-pad stage lead |
| 玩偶造型工坊 | Lumi Doll | `chr_lumi_doll/master.svg` | `puppet-studio.svg` | wardrobe model |
| 阵线骑士 | Aegis Rowan | `chr_aegis_rowan/master.svg` | `formation-knights.svg` | player-side knight |
| 月光奶茶铺 | Mina Vale | `chr_mina_vale/master.svg` | `moonlight-tea-shop.svg` | order-station keeper |

Each cover uses an SVG `<image>` reference to the same canonical master loaded by `character-runtime-v1.js`. The 33 non-pilot games remain on `store-fidelity-v4` and their existing runtimes.

The generator is `scripts/generate-character-consistency-v1.mjs`. It produces deterministic character masters, per-character contracts, five shared-source covers and a checksum manifest.
