# Airvana character consistency v1

This is the approved local prototype for keeping a game's cover character and in-game character visually identical at the identity level.

## Scope

- Five pilot games: Pixel Quest, Paws Stage, Puppet Studio, Formation Knights and Moonlight Tea Shop.
- One original canonical vector master per game.
- Home and Discover covers reference the same master used by the Canvas runtime.
- No third-party application-market character, screenshot, logo or branded UI.
- No gameplay, CTA, reward, wallet, attribution, settlement or data-policy change.
- The prior v4 cover/runtime presentation remains the rollback target.

## Runtime

`public/character-runtime-v1.js` lazy-loads the character master and draws it into the existing Canvas game. If the asset is unavailable, the previous deterministic Canvas character remains visible and the game remains playable.

## Status

Local prototype scope is approved by the user. External commercial release, final rights review and migration of the remaining 33 games are not approved by this package.
