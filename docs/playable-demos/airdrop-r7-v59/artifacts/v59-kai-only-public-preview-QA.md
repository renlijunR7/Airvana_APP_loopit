# v59 Kai-only public preview — QA

Verification date: 2026-09-02

## Result

- **Public local preview: PASS**
- **Formal Kai Live2D: BLOCKED**
- **Production release: BLOCKED**

## Package integrity and syntax

| Check | Result |
|---|---|
| Host inline JavaScript | PASS — 3/3 scripts parsed |
| PlayableConfig JSON | PASS |
| Adapter JSON | PASS |
| Kai resource slot | PASS — `BLOCKED`, authorization `PENDING`, rights not confirmed |
| Mao selector in Presenter Tweaks | ABSENT |
| Mao image preload | ABSENT |

## Browser verification

Tested over local HTTP in headless Chrome at 430 × 932.

| Check | Result |
|---|---|
| Host HTTP response | 200 |
| Default chat header | Kai |
| Default presenter mode | `hybrid` |
| Active renderer | `sprite` |
| Cubism gate result | expected failure: `model-export-pending` |
| Kai face sheet | HTTP 200 |
| Answer text rendered | PASS |
| Answer face-frame sequence | `mouth-a`, `rest`, `mouth-e`, `blink`, `mouth-o` observed |
| Mao runtime / Mao asset request | NONE |
| Cubism Core request | NONE |
| Page-level horizontal overflow | NONE (`scrollWidth = 430`) |
| Browser runtime errors in the interaction run | NONE |

## What this proves

The uploaded package can run the identity-safe Kai sprite preview and the existing mouth/eye frame sequence without publishing Cubism Core or Mao model data.

It does **not** prove that an authorized Kai `moc3` exists, that a Live2D Publication License applies or has been granted, that the fallback is formal Live2D, or that the campaign is production-ready.

## Remaining blockers

1. Supply and review an authorized Kai `model3.json`, `moc3`, textures, physics, motions, expressions, and full asset manifest.
2. Confirm Kai model, likeness, commercial, source-distribution, and production rights.
3. Obtain Live2D's written classification/licensing decision for the intended multi-KOL AI/chatbot application.
4. Approve a v59 Campaign Brief and Campaign Contract.
5. Complete target-device, production WebView, accessibility, privacy, and backend integration QA.
