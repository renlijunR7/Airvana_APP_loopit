// 把旧版 Web 的游戏引擎与美术资产同步进 Flutter 的 H5 runner。
// Web 端更新引擎后重跑本脚本即可保持两版一致：node scripts/sync-flutter-runner.mjs
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const webDir = path.join(root, 'public');
const runnerDir = path.join(root, 'apps/airvana_mobile/assets/runner');

// 按 index.html 的加载顺序排列：容器必须先于向它注册的引擎。
export const ENGINE_FILES = [
  'vendor/matter-0.20.0.min.js',
  'sensor-interactions-v1.js',
  'game-art-system-v1.js',
  'playable-assets-v3.js',
  'complete-games-v3.js',
  'deep-games-v2.js',
  'physics-art-v2.js',
  'physics-sling-rope-v1.js',
  'physics-water-v1.js',
  'physics-fruit-v1.js',
  'physics-arcade-v1.js',
  'reference-action-v1.js',
  'reference-worlds-v1.js',
  'reference-puzzles-v1.js',
  'reference-arcade-v1.js',
  'reference-screenshots-v1.js',
];

export const ASSET_DIRS = [
  'classic-v1',
  'casual-v1',
  'physics-v1',
  'physics-casual-v2',
  'reference-v1',
  'reference-screenshots-v1',
];

// 引擎文件必须与 Web 源逐字节一致（active-classic-art-v1 测试会校验），
// 所以路径不在这里改写：playable-runner.html 里有运行时垫片把少数
// 裸绝对路径（/assets/games/…）映射到 bundle 内的相对位置。
export function rewriteAssetPaths(source) {
  return source;
}

function copyEngine(relative) {
  const from = path.join(webDir, relative);
  if (!fs.existsSync(from)) throw new Error(`缺少引擎文件：${relative}`);
  const to = path.join(runnerDir, path.basename(relative));
  const rewritten = rewriteAssetPaths(fs.readFileSync(from, 'utf8'));
  fs.writeFileSync(to, rewritten);
  return { file: path.basename(relative), bytes: Buffer.byteLength(rewritten) };
}

function copyAssets(dir) {
  const from = path.join(webDir, 'assets/games', dir);
  if (!fs.existsSync(from)) return { dir, skipped: true };
  const to = path.join(runnerDir, 'assets/games', dir);
  // 合并而不是替换：Flutter 侧有 Web 源没有的派生文件（如 classic-v1/covers-png），
  // 整目录删除会连它们一起抹掉。
  fs.cpSync(from, to, { recursive: true, force: true });
  let files = 0;
  for (const entry of fs.readdirSync(to, { recursive: true, withFileTypes: true })) {
    if (entry.isFile()) files += 1;
  }
  return { dir, files };
}

export function sync() {
  fs.mkdirSync(runnerDir, { recursive: true });
  const engines = ENGINE_FILES.map(copyEngine);
  const assets = ASSET_DIRS.map(copyAssets);
  return { engines, assets };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const result = sync();
  for (const engine of result.engines) console.log(`引擎 ${engine.file} (${(engine.bytes / 1024).toFixed(0)}KB)`);
  for (const asset of result.assets) {
    console.log(asset.skipped ? `资产 ${asset.dir} 不存在，跳过` : `资产 ${asset.dir} ${asset.files} 个文件`);
  }
  console.log(`同步完成：${result.engines.length} 个引擎、${result.assets.filter(a => !a.skipped).length} 个资产目录`);
}
