import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function text(path) {
  return readFile(new URL(path, root), "utf8");
}

test("HTML exposes the playable canvas and local ES module entry", async () => {
  const html = await text("index.html");
  assert.match(html, /<canvas id="gameCanvas"/);
  assert.match(html, /src="\.\/game\/main\.js"/);
  assert.match(html, /href="\.\/manifest\.webmanifest"/);
  assert.doesNotMatch(html, /https?:\/\//);
});

test("runtime provides controls, boss flow, persistence and QA API", async () => {
  const runtime = await text("game/main.js");
  for (const marker of [
    "pointerdown",
    "pointercancel",
    "handleAction",
    "beginBoss",
    "kickBomb",
    "localStorage",
    "window.__runnerQA",
    "serviceWorker.register"
  ]) {
    assert.ok(runtime.includes(marker), "missing runtime contract: " + marker);
  }
});

test("manifest and service worker are same-scope and offline ready", async () => {
  const manifest = JSON.parse(await text("manifest.webmanifest"));
  const worker = await text("service-worker.js");
  assert.equal(manifest.start_url, "./");
  assert.equal(manifest.scope, "./");
  assert.equal(manifest.display, "standalone");
  assert.ok(manifest.icons.some((icon) => icon.purpose.includes("maskable")));
  for (const required of ["./index.html", "./styles.css", "./game/main.js", "./game/logic.js"]) {
    assert.ok(worker.includes(required), "service worker misses " + required);
  }
});

test("all shipped visual/audio content is local and code-drawn", async () => {
  const runtime = await text("game/main.js");
  const css = await text("styles.css");
  assert.doesNotMatch(runtime, /new Image|fetch\(|https?:\/\//);
  assert.doesNotMatch(css, /url\(\s*["']?https?:\/\//);
  assert.match(runtime, /AudioContext/);
  assert.match(runtime, /drawCat/);
  assert.match(runtime, /drawRaccoon/);
});
