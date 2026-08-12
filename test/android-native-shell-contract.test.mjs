import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const mobileEntry = read('public/index.html');
const mobileCss = read('public/airvana-v4.css');
const mainActivity = read('android-demo/app/src/main/java/ai/airvana/demo/MainActivity.java');
const androidStyles = read('android-demo/app/src/main/res/values/styles.xml');
const androidManifest = read('android-demo/app/src/main/AndroidManifest.xml');
const androidStrings = read('android-demo/app/src/main/res/values/strings.xml');
const launcherIcon = read('android-demo/app/src/main/res/drawable/ic_launcher.xml');
const adaptiveLauncherIcon = read('android-demo/app/src/main/res/drawable-v26/ic_launcher.xml');

test('native shell hides the simulated web status bar without changing browser preview', () => {
  assert.match(mobileEntry, /new URLSearchParams\(location\.search\)\.get\('native-shell'\) === '1'/);
  assert.match(mobileEntry, /document\.documentElement\.classList\.add\('native-app-shell'\)/);
  assert.match(mobileCss, /\.native-app-shell \.app-header\s*\{[^}]*display:\s*none\s*!important;/);
});

test('Android launcher exposes the Airvana brand mark on a real device', () => {
  assert.match(androidManifest, /android:icon="@drawable\/ic_launcher"/);
  assert.match(androidManifest, /android:roundIcon="@drawable\/ic_launcher"/);
  assert.match(androidManifest, /android:label="@string\/app_name"/);
  assert.match(androidStrings, /<string name="app_name">Airvana<\/string>/);
  assert.match(launcherIcon, /android:fillColor="#FF334B"/);
  assert.match(launcherIcon, /android:fillColor="#050505"/);
  assert.match(launcherIcon, /android:fillColor="#2864FF"/);
  assert.doesNotMatch(launcherIcon, /M29,29h19v19/);
  assert.match(adaptiveLauncherIcon, /<adaptive-icon/);
  assert.match(adaptiveLauncherIcon, /@color\/ic_launcher_background/);
  assert.match(adaptiveLauncherIcon, /@drawable\/ic_launcher_foreground/);
});

test('home header logo uses a dedicated crop frame instead of generic image sizing', () => {
  assert.match(mobileEntry, /class="app-topbar__logo-frame"/);
  assert.match(mobileEntry, /class="app-topbar__logo" src="logo\.png"/);
  assert.match(mobileCss, /\.app-topbar__logo-frame\s*\{[^}]*width:\s*65px;[^}]*height:\s*32px;[^}]*overflow:\s*hidden;/);
  assert.match(mobileCss, /\.app-topbar__logo\s*\{[^}]*width:\s*96px;[^}]*height:\s*32px;[^}]*margin-left:\s*-15px;/);
  assert.match(mobileCss, /\.native-app-shell \.app-topbar\s*\{[^}]*padding-top:\s*calc\(12px \+ var\(--safe-top\)\)\s*!important;/);
});

test('bottom navigation keeps a transparent safe-area wrapper and an opaque capsule', () => {
  assert.match(mobileEntry, /class="bottom-nav"[^>]*background:transparent/);
  assert.match(mobileEntry, /class="bottom-nav__capsule"[^>]*background:var\(--surface-card,#FFFFFF\)[^>]*border-radius:999px/);
  assert.match(mobileCss, /\.app-shell > \.bottom-nav\s*\{[^}]*padding-bottom:\s*calc\(12px \+ var\(--safe-bottom\)\)\s*!important;[^}]*background:\s*transparent\s*!important;[^}]*pointer-events:\s*none;/);
  assert.match(mobileCss, /\.app-shell > \.bottom-nav > \.bottom-nav__capsule,[\s\S]*?\.app-shell > \.bottom-nav > \[role="button"\]\s*\{[^}]*pointer-events:\s*auto;/);
});

test('bottom navigation is visually compact without shrinking its touch targets', () => {
  assert.match(mobileCss, /\.app-shell > \.bottom-nav\s*\{[^}]*width:\s*min\(318px, calc\(100% - 32px\)\)\s*!important;[^}]*transform:\s*translateX\(-50%\);/);
  assert.match(mobileCss, /\.app-shell > \.bottom-nav > \.bottom-nav__capsule\s*\{[^}]*padding-block:\s*2px\s*!important;/);
  assert.match(mobileCss, /\.bottom-nav \[role="button"\][\s\S]*?min-width:\s*var\(--touch-target\)\s*!important;[\s\S]*?min-height:\s*var\(--touch-target\)\s*!important;/);
  assert.match(mobileCss, /\.app-shell > \.bottom-nav\s*\{[^}]*padding-top:\s*3px\s*!important;/);
  assert.equal((mobileEntry.match(/class="bottom-nav__icon"/g) || []).length, 5);
  assert.match(mobileCss, /\.bottom-nav__icon\s*\{[^}]*width:\s*23px\s*!important;[^}]*height:\s*23px\s*!important;/);
});

test('home feed reserves the floating navigation height above the native safe area', () => {
  assert.match(mobileEntry, /class="play-feed"/);
  assert.match(mobileEntry, /class="play-feed__actions"/);
  assert.match(mobileCss, /--bottom-nav-reserve:\s*65px;/);
  assert.match(mobileCss, /\.play-feed__actions\s*\{[^}]*padding-bottom:\s*calc\(14px \+ var\(--bottom-nav-reserve\) \+ var\(--safe-bottom\)\)\s*!important;/);
  assert.doesNotMatch(mobileEntry, /class="play-feed__actions"[^>]*env\(safe-area-inset-bottom/);
});

test('discover, world, messages, and me keep their final content above the floating navigation', () => {
  assert.equal((mobileEntry.match(/class="[^"]*main-tab-scroll[^"]*"/g) || []).length, 4);
  assert.match(mobileEntry, /isDiscover[\s\S]*?class="main-tab-scroll"/);
  assert.match(mobileEntry, /isWorld[\s\S]*?class="main-tab-scroll"/);
  assert.match(mobileEntry, /isMessages[\s\S]*?class="messages-screen main-tab-scroll"/);
  assert.match(mobileEntry, /isMe[\s\S]*?class="main-tab-scroll"/);
  assert.doesNotMatch(mobileEntry, /class="play-feed main-tab-scroll"/);
  assert.match(mobileCss, /\.main-tab-scroll\s*\{[^}]*scroll-padding-bottom:\s*calc\(var\(--bottom-nav-reserve\) \+ var\(--safe-bottom\)\);/);
  assert.match(mobileCss, /\.main-tab-scroll::after\s*\{[^}]*height:\s*calc\(var\(--bottom-nav-reserve\) \+ var\(--safe-bottom\)\);[^}]*flex:\s*0 0 calc\(var\(--bottom-nav-reserve\) \+ var\(--safe-bottom\)\);/);
});

test('home feed actions are compact while keeping Remix visually unchanged', () => {
  assert.match(mobileEntry, /class="play-feed__author-row"/);
  assert.match(mobileCss, /\.play-feed__actions > div:first-child\s*\{[^}]*gap:\s*8px\s*!important;/);
  assert.match(mobileCss, /\.play-feed__actions > div:first-child > \[role="button"\]:not\(:last-child\) > svg\s*\{[^}]*width:\s*20px\s*!important;[^}]*height:\s*20px\s*!important;/);
  assert.match(mobileCss, /\.play-feed__author-row\s*\{[^}]*margin-top:\s*8px\s*!important;/);
  assert.match(mobileEntry, /aria-label="\{\{ ss\.remixAriaLabel \}\}"[\s\S]*?<svg width="14" height="14"/);
});

test('Android activity draws behind a transparent navigation bar and passes its inset to CSS', () => {
  assert.match(mainActivity, /setNavigationBarColor\(Color\.TRANSPARENT\)/);
  assert.match(mainActivity, /View\.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION/);
  assert.match(mainActivity, /View\.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN/);
  assert.match(mainActivity, /loadUrl\("http:\/\/127\.0\.0\.1:8082\/\?native-shell=1"\)/);
  assert.match(mainActivity, /getSystemWindowInsetBottom\(\)/);
  assert.match(mainActivity, /getSystemWindowInsetTop\(\)/);
  assert.match(mainActivity, /setProperty\('--native-safe-top','" \+ topValue \+ "'\)/);
  assert.match(mainActivity, /setProperty\('--safe-top','var\(--native-safe-top\)'\)/);
  assert.match(mainActivity, /setProperty\('--native-safe-bottom','" \+ bottomValue \+ "'\)/);
  assert.match(mainActivity, /setProperty\('--safe-bottom','var\(--native-safe-bottom\)'\)/);
  assert.match(androidStyles, /<item name="android:navigationBarColor">@android:color\/transparent<\/item>/);
});

test('creation overlay consumes native top and bottom safe areas without changing control sizes', () => {
  assert.match(mobileEntry, /class="create-overlay"/);
  assert.match(mobileEntry, /class="create-power-scroll"[^>]*padding:18px 16px calc\(88px \+ var\(--safe-bottom\)\)/);
  assert.match(mobileEntry, /class="template-grid"[^>]*padding:4px 14px calc\(104px \+ var\(--safe-bottom\)\)/);
  assert.equal((mobileEntry.match(/class="create-home-dock"/g) || []).length, 2);
  assert.doesNotMatch(mobileEntry, /class="create-home-dock"[^>]*bottom:17px/);
  assert.match(mobileCss, /\.native-app-shell \.create-overlay \.create-mode-canvas\s*\{[^}]*padding-top:\s*var\(--safe-top\);/);
  assert.match(mobileCss, /\.create-home-dock\s*\{[^}]*bottom:\s*calc\(17px \+ var\(--safe-bottom\)\);/);
  assert.match(mobileCss, /\.composer-sheet-scroll\s*\{[^}]*padding:\s*14px 18px calc\(22px \+ var\(--safe-bottom\)\);/);
  assert.match(mobileCss, /\.native-app-shell \.secondary-page-header\s*\{[^}]*padding-top:\s*max\(18px, calc\(12px \+ var\(--safe-top\)\)\)\s*!important;/);
  assert.match(mobileEntry, /createBodyPadding:s\.createStep==='home'\?'0':'12px 20px calc\(30px \+ var\(--safe-bottom\)\)'/);
});
