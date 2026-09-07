import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const catalogPath = path.join(root, 'docs/playable-demos/home-complete-v3/game-catalog.json');
const releaseGatePath = path.join(root, 'docs/game-assets/fidelity-v2/release-gate.json');
const outputPath = path.join(root, 'public/assets/games/fidelity-v2/manifest.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const releaseGate = JSON.parse(fs.readFileSync(releaseGatePath, 'utf8'));

function checksum(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function dimensions(filePath) {
  const data = fs.readFileSync(filePath);
  if (data.subarray(1, 4).toString('ascii') === 'PNG') {
    return {width: data.readUInt32BE(16), height: data.readUInt32BE(20)};
  }
  let offset = 2;
  while (offset < data.length) {
    if (data[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = data[offset + 1];
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return {height: data.readUInt16BE(offset + 5), width: data.readUInt16BE(offset + 7)};
    }
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }
    offset += 2 + data.readUInt16BE(offset + 2);
  }
  throw new Error(`Unsupported image: ${filePath}`);
}

function rendition(relativePath, format) {
  const absolutePath = path.join(root, relativePath);
  const stat = fs.statSync(absolutePath);
  return {
    path: relativePath,
    format,
    ...dimensions(absolutePath),
    bytes: stat.size,
    sha256: checksum(absolutePath)
  };
}

const assets = catalog.games.map(game => ({
  asset_id: `asset_fidelity_v2_${game.slug}`,
  game_key: game.slug,
  content_id: game.content_id,
  title: game.title,
  mechanic: game.mechanic,
  runtime: game.runtime,
  role: 'dedicated_gameplay_scene',
  owner: 'Airvana local demo owner',
  provenance: 'OpenAI built-in ImageGen; prompt record in docs/game-assets/fidelity-v2/prompt-set.md',
  authorization_status: 'pending_human_release_approval',
  locale: 'language-neutral',
  version: '2.0.0',
  usage_restrictions: [
    'Airvana LOCAL_DEMO only until human brand and release approval',
    'No third-party logo, trademark, UI text, watermark, or known character IP',
    'Do not treat the generated scene as evidence of a commercial partnership'
  ],
  review_status: releaseGate.technical_review.status,
  release_approved: false,
  expires_at: null,
  source: rendition(`public/assets/games/fidelity-v2/source/${game.slug}-gameplay-v2.png`, 'png'),
  runtime_asset: rendition(`public/assets/games/fidelity-v2/runtime/${game.slug}-gameplay-v2.jpg`, 'jpeg'),
  flutter_asset: `apps/airvana_mobile/assets/runner/assets/games/fidelity-v2/runtime/${game.slug}-gameplay-v2.jpg`
}));

const manifest = {
  schema: 'airvana.game-art-manifest.v2',
  version: '2.0.0',
  generated_at: '2026-09-05T00:00:00+08:00',
  status: 'LOCAL_DEMO',
  source_generator: 'OpenAI built-in ImageGen',
  prompt_set: 'docs/game-assets/fidelity-v2/prompt-set.md',
  base_campaign_contract: 'docs/playable-demos/home-complete-v3/campaign-contract.json',
  game_count: assets.length,
  authorization_status: 'pending_human_release_approval',
  release_review: releaseGate,
  assets
};

fs.mkdirSync(path.dirname(outputPath), {recursive: true});
fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote ${path.relative(root, outputPath)} with ${assets.length} assets.`);
