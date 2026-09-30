# Power icon completion — 2026-09-23

## Scope

Complete the 12 missing **visible** Flutter Power card images. Existing 47 images, copy, support/approval badges, selection controls, hit areas, routes and capability behavior remain unchanged. `failureRetry` is hidden (`visibleInCatalog: false`) and deliberately not expanded by this presentation-only change.

## Assets and production

- Generated with the built-in image generation tool, one image per capability (not a sprite sheet).
- Style references: existing `app-publish.png`, `npc.png`, `external-connectors.png`; the sensing batch also referenced `motion-haptic.png`.
- Shipping PNGs: `apps/airvana_mobile/assets/legacy/capability-icons/`. Byte-identical mirrors were also written to `public/assets/capability-icons/` in the working tree, but the Web build is retired and they are deliberately left untracked.
- Exported to the existing 256 × 256 asset size with macOS `sips`; preserved generated alpha. The original high-resolution tool outputs were left intact outside the repository.
- No new web catalog entries or business functionality were added.

## Final prompt set

Every prompt is the following shared style text plus `Subject: ` and the per-file subject below.

```text
Use case: stylized-concept. Asset type: one square mobile Power capability icon. The supplied PNGs are STYLE REFERENCES only: match their rounded-square tile, bright saturated gradient, tactile colorful toy-like 3D plastic, softly beveled edges, studio light from upper left, deep soft contact shadows, clean chunky silhouettes. Make a distinct original subject matching the requested capability. One centered icon, front three-quarter view, fills about 85% of square with rounded tile inset 4%, solid black outside rounded tile corners as in references. Readable at 44px. No text, no letters, no labels, no logos, no watermark, no multi-icon sheet. Deliver one square PNG.
```

### ads-api.png

Advertising campaign management: a large coral red and ivory megaphone, backed by a small blue campaign control panel showing three simple chunky colorful vertical bars and a gold slider knob. Warm orange rounded-square tile. Express creating and managing ad campaigns, not payments.

Original generation: `exec-e68c60ca-80fa-4f89-9abb-da34d2d5816c.png`.

### ads-mcp.png

Marketing AI agent: a friendly compact ivory robot head with a navy face and cyan eyes, beside a small coral analytics dashboard with a simple ascending bar chart, connected by a short mint connector. Purple rounded-square tile. Express AI reading and understanding campaign performance, no rocket, no money.

Original generation: `exec-13d218ce-7822-4f9a-a770-02705439b33d.png`.

### device-posture.png

Phone posture: a tilted violet smartphone with a bright blue screen, encircled by one chunky golden curved rotation arrow, two small orientation markers. Deep azure rounded-square tile. Clearly show rotating and tilting the physical phone.

Original generation: `exec-892c3f37-0fcd-4145-a82a-08c2bdc68597.png`.

### face-expression.png

Facial expression recognition: a large friendly yellow smiling face inside four thick cyan camera scan corners, with two simple tiny tracking dots beside the cheeks. Violet rounded-square tile. Focus on face sensing, no robot.

Original generation: `exec-5ae3abaf-14ad-41cf-aeb6-e3263ad255b5.png`.

### body-pose.png

Body pose recognition: a single lively full-body coral toy human figure striking a dance pose, a few bright cyan spherical keypoints on wrists knees and shoulders. Deep blue rounded-square tile. Readable silhouette with raised arm and bent leg.

Original generation: `exec-9b8779b6-2f82-4810-9eec-e00df8c422db.png`.

### environment-scan.png

Environment recognition and scanning: a small coral and cream 3D cube inside four big mint scanner corners, with one bright cyan scan beam across it. Purple rounded-square tile. Simple real object scanning, no text or detailed QR code.

Original generation: `exec-b695c043-abb0-48b8-8e1b-04609d12042c.png`.

### geo-location.png

Geographic location: a large coral red location pin standing on a small folded cream and mint map with one clear blue route. Blue rounded-square tile. Chunky toy-like pin dominates.

Original generation: `exec-eb0474b6-4b76-4762-99a1-4a355eaa8e26.png`.

### compass-heading.png

Electronic compass: a chunky ivory circular compass body with a coral and cyan diamond needle pointing diagonally, a golden rim, four simple unlettered direction tick marks. Deep teal rounded-square tile. Clear orientation and treasure-hunt direction.

Original generation: `exec-5e428bc8-3c8a-4fcd-8011-730db1a921ad.png`.

### ambient-sensing.png

Ambient light and proximity sensing: a violet smartphone with a bright cyan screen, a friendly small golden sun above one corner and two short turquoise sensor waves near its top edge. Deep blue rounded-square tile. Simple large forms, not weather forecast.

Original generation: `exec-51ee660b-7e7a-4c42-ac9e-02dd5e99bc6e.png`.

### step-activity.png

Step counting and activity: one large colorful coral sneaker with an ivory sole taking a step, one mint footprint and a short curved golden activity arc behind it. Purple rounded-square tile. Express real walking and fitness tracking.

Original generation: `exec-9c9c6441-6b7b-467e-ab70-7cec804bb33d.png`.

### proximity-link.png

Near-field connection: two small chunky ivory smartphones tilted toward each other with cyan and violet screens; a bright mint short wireless contact arc between their top edges. Warm orange rounded-square tile. Express tap-to-connect NFC and nearby pairing, no people.

Original generation: `exec-6453e299-5ae6-4225-8dbc-7c9b9b94d83f.png`.

### kol-twin.png

Creator AI digital twin: two matching friendly toy-style human avatar busts side by side, one solid with coral jacket and dark purple hair, one cyan translucent digital duplicate with a tiny golden sparkle between them. Purple rounded-square tile. Same person's intelligent double, not generic group/social sharing.

Original generation: `exec-0f0c3925-8bd6-4b1d-a299-11d4d68ee6a8.png`.

