# Kai Cubism resource gate — public preview

This directory intentionally contains only the Kai authorization gate used by the host.

Current state: `BLOCKED / PENDING`.

Not included:

- Live2D Cubism Core or Framework runtime;
- an authorized Kai `model3.json` / `moc3` bundle;
- textures, physics, motions, expressions, or production rights evidence.

The host reads `Resources/Kai/RESOURCE_SLOT.json`, observes that the bundle is not authorized, and uses the existing Kai sprite fallback. Do not change the slot to `AUTHORIZED` until the model package, exact file hashes, identity/model rights, and release approval have been reviewed.

Live2D licence references:

- [Cubism SDK for Web](https://docs.live2d.com/en/cubism-sdk-manual/cubism-sdk-for-web/)
- [Live2D Proprietary Software License Agreement](https://www.live2d.com/eula/live2d-proprietary-software-license-agreement_en.html)
- [SDK Release License](https://www.live2d.com/en/sdk/license/)
