const fs = require("fs");
const path = require("path");
const Babel = require("../vendor/offline/babel.min.js");

const root = path.resolve(__dirname, "..");
const outputFile = path.join(root, "output", "Airvana_Airdrop_Game_Offline.html");

const cssFiles = ["styles.css", "kol-ai.css", "social.css", "campaign-p0.css"];
const sourceFiles = [
  "data.js",
  "art.jsx",
  "scenes-a.jsx",
  "scenes-b.jsx",
  "kols.jsx",
  "figures.jsx",
  "social.jsx",
  "tweaks-panel.jsx",
  "campaign-p0.jsx",
  "airdrop-versions.jsx",
  "kol-ai.jsx",
  "sheets.jsx",
  "game.jsx"
];

const kolAvatarFiles = Array.from({ length: 38 }, (_, index) =>
  `assets/kol-avatars/avatar-${String(index + 1).padStart(2, "0")}.png`
);

const assetFiles = [
  "assets/mexc-logo.svg",
  "assets/kol-avatars/wanzi-live2d-studio-sprite-v1.png",
  "assets/kol-avatars/wanzi-live2d-studio-sprite-v2.png",
  "assets/kol-avatars/kol-hosts-six-v1.png",
  "assets/kol-avatars/kai-live2d-visemes-v1.png",
  "assets/generated_v1/stage-space-v1.png",
  "assets/generated_v1/wanzi-full-v2.png",
  "assets/generated_v1/wanzi-face-v2.png",
  "assets/generated_v3/command-idle.jpg",
  "assets/generated_v3/command-listening.jpg",
  "assets/generated_v3/command-thinking.jpg",
  "assets/generated_v3/command-talk-open.jpg",
  "assets/generated_v3/command-talk-closed.jpg",
  "assets/generated_v3/command-emphasis.jpg",
  "assets/generated_v3/neon-idle.jpg",
  "assets/generated_v3/neon-listening.jpg",
  "assets/generated_v3/neon-thinking.jpg",
  "assets/generated_v3/neon-talk-open.jpg",
  "assets/generated_v3/neon-talk-closed.jpg",
  "assets/generated_v3/neon-emphasis.jpg",
  "assets/generated_v3/armor-idle.jpg",
  "assets/generated_v3/armor-listening.jpg",
  "assets/generated_v3/armor-thinking.jpg",
  "assets/generated_v3/armor-talk-open.jpg",
  "assets/generated_v3/armor-talk-closed.jpg",
  "assets/generated_v3/armor-emphasis.jpg",
  "assets/generated_v1/coin-rim-v1.png",
  "assets/generated_v1/parachute-v1.png",
  "assets/generated_v1/wallet-catcher-v1.png",
  "assets/generated_v1/settlement-card-bg-v1.png",
  "assets/generated_v1/moon-medallion-v1.png",
  "assets/generated_v1/settlement-crystals-v1.png",
  ...kolAvatarFiles
];

const mimeTypes = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml"
};

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function toDataUri(relativePath) {
  const extension = path.extname(relativePath).toLowerCase();
  const mime = mimeTypes[extension];
  if (!mime) throw new Error("Unsupported asset type: " + extension);
  const data = fs.readFileSync(path.join(root, relativePath)).toString("base64");
  return "data:" + mime + ";base64," + data;
}

const assetMap = new Map(assetFiles.map((file) => [file, toDataUri(file)]));

function inlineAssets(source) {
  let result = source;
  for (const [relativePath, dataUri] of assetMap) {
    result = result.split(relativePath).join(dataUri);
  }
  return result;
}

const styles = inlineAssets(
  cssFiles.map((file) => "/* " + file + " */\n" + read(file)).join("\n\n")
).replace(/\/\*[\s\S]*?\*\//g, "").replace(/<\/style/gi, "<\\/style");

const combinedSource = sourceFiles
  .map((file) => "\n/* ===== " + file + " ===== */\n" + read(file))
  .join("\n");

const compiled = Babel.transform(inlineAssets(combinedSource), {
  presets: ["react"],
  sourceType: "script",
  compact: false,
  comments: false,
  filename: "airvana-offline.jsx"
}).code.replace(/<\/script/gi, "<\\/script");

function inlineVendor(relativePath) {
  return read(relativePath)
    .replace(/\/\/#[#]? sourceMappingURL=.*$/gm, "")
    .replace(/<\/script/gi, "<\\/script");
}

const react = inlineVendor("vendor/offline/react.production.min.js");
const reactDom = inlineVendor("vendor/offline/react-dom.production.min.js");

const html = [
  "<!DOCTYPE html>",
  '<html lang="en">',
  "<head>",
  '<meta charset="UTF-8" />',
  '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />',
  '<meta name="color-scheme" content="light dark" />',
  '<meta name="description" content="Airvana HTX Airdrop Quest · Offline Mock Demo" />',
  "<title>HTX Airdrop Quest · KOL Lifecycle · Offline Mock Demo</title>",
  "<style>",
  styles,
  "</style>",
  "</head>",
  "<body>",
  '<div id="root"></div>',
  "<noscript>Please enable JavaScript to run this demo.</noscript>",
  "<script>",
  react,
  "</script>",
  "<script>",
  reactDom,
  "</script>",
  "<script>",
  compiled,
  "</script>",
  "</body>",
  "</html>",
  ""
].join("\n");

fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, html);

console.log(outputFile);
console.log("bytes=" + fs.statSync(outputFile).size);
