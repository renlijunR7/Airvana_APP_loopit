import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

// Raster build of original code-native SVG art for Flutter Image.asset.
// No generative image tooling and no new package installation are required.
// Pass --sharp-module=/absolute/path/to/installed/sharp when it is not local.
const require = createRequire(import.meta.url);
const moduleArgument = process.argv.find(value => value.startsWith('--sharp-module='));
const sharp = require(moduleArgument ? moduleArgument.slice('--sharp-module='.length) : 'sharp');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDirectory = path.join(root, 'public/assets/games/classic-v1/covers');
const outputDirectory = path.join(root, 'apps/airvana_mobile/assets/runner/assets/games/classic-v1/covers-png');
const files = (await fs.readdir(sourceDirectory)).filter(file => file.endsWith('.svg')).sort();
if (files.length !== 38) throw new Error('Expected exactly 38 reviewed original classic SVG covers.');
await fs.mkdir(outputDirectory, { recursive: true });
const entries = [];
for (const file of files) {
  const source = await fs.readFile(path.join(sourceDirectory, file));
  if (/<(?:image|filter|linearGradient|radialGradient)\b|data:image\//i.test(source.toString())) {
    throw new Error('Cover contains embedded raster or photographic effects: ' + file);
  }
  const target = file.replace(/\.svg$/, '.png');
  const png = await sharp(source, { density: 144 }).resize(720, 1120).png({ compressionLevel: 9, palette: true }).toBuffer();
  await fs.writeFile(path.join(outputDirectory, target), png);
  entries.push({ file: target, source: 'public/assets/games/classic-v1/covers/' + file, sourceSha256: createHash('sha256').update(source).digest('hex'), sha256: createHash('sha256').update(png).digest('hex'), width: 720, height: 1120, bytes: png.length });
}
await fs.writeFile(path.join(outputDirectory, 'manifest.json'), JSON.stringify({ version: '1.0.0', source: 'ORIGINAL_CODE_NATIVE_SVG', renderer: 'sharp', entries }, null, 2) + '\n');
console.log(JSON.stringify({ rendered: entries.length, outputDirectory, bytes: entries.reduce((sum, item) => sum + item.bytes, 0) }));
