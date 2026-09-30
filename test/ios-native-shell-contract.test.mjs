import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const webContainer = fs.readFileSync(path.join(root, 'ios-demo/AirvanaDemo/AirvanaWebContainer.swift'), 'utf8');
const projectConfig = fs.readFileSync(path.join(root, 'ios-demo/project.yml'), 'utf8');
const installScript = fs.readFileSync(path.join(root, 'ios-demo/install-on-device.sh'), 'utf8');
const mobileEntry = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8')
  + fs.readFileSync(path.join(root, 'public/boot.js'), 'utf8');
const mobileCss = fs.readFileSync(path.join(root, 'public/airvana-v4.css'), 'utf8');
const infoPlist = fs.readFileSync(path.join(root, 'ios-demo/AirvanaDemo/Info.plist'), 'utf8');
const flutterMain = fs.readFileSync(path.join(root, 'apps/airvana_mobile/lib/main.dart'), 'utf8');
const flutterIosProject = fs.readFileSync(path.join(root, 'apps/airvana_mobile/ios/Runner.xcodeproj/project.pbxproj'), 'utf8');
const flutterWebParityShellExists = fs.existsSync(path.join(root, 'apps/airvana_mobile/lib/features/web_parity'));
const gameWebView = fs.readFileSync(path.join(root, 'apps/airvana_mobile/lib/features/runtime/data/game_webview_controller.dart'), 'utf8');
const assetServer = fs.readFileSync(path.join(root, 'apps/airvana_mobile/lib/features/runtime/data/standalone_asset_server.dart'), 'utf8');

test('iOS native shell removes the gray input assistant and keeps the keyboard until an explicit outside tap', () => {
  assert.match(webContainer, /inputAssistantItem\.leadingBarButtonGroups = \[\]/);
  assert.match(webContainer, /inputAssistantItem\.trailingBarButtonGroups = \[\]/);
  assert.match(webContainer, /keyboardDismissMode = \.none/);
});

test('iOS native shell exposes the new physical-device build metadata', () => {
  assert.match(webContainer, /AirvanaLoopit\/1\.0\.13 \(iOS; WKWebView\)/);
  assert.match(webContainer, /native-version=1\.0\.13&native-build=15/);
  assert.match(projectConfig, /DEVELOPMENT_TEAM: AFPAHT853U/);
  assert.match(installScript, /TEAM_ID="\$\(sed -n/);
});

test('iOS native shell prompts for microphone capture only from the bundled Airvana origin', () => {
  assert.match(webContainer, /requestMediaCapturePermissionFor origin: WKSecurityOrigin/);
  assert.match(webContainer, /origin\.protocol == "airvana" && origin\.host == "app"/);
  assert.match(webContainer, /type == \.microphone/);
  assert.match(webContainer, /decisionHandler\(\.prompt\)/);
  assert.match(infoPlist, /NSMicrophoneUsageDescription/);
  assert.match(infoPlist, /音频仅实时分析，不录制、不上传/);
});

test('iOS native shell tightens the physical-device top and bottom spacing only', () => {
  assert.match(webContainer, /native-platform=ios/);
  assert.match(webContainer, /classList\.add\('native-app-shell', 'native-ios-shell'\)/);
  assert.match(mobileEntry, /nativeParams\.get\('native-platform'\) === 'ios'/);
  assert.match(mobileEntry, /classList\.add\('native-ios-shell'\)/);
  assert.match(mobileCss, /html\.native-ios-shell \.app-topbar\s*\{[^}]*padding-top:\s*calc\(5px \+ var\(--safe-top\)\)\s*!important;/);
  assert.match(mobileCss, /html\.native-ios-shell \.app-shell > \.bottom-nav\s*\{[^}]*padding-bottom:\s*max\(0px, calc\(var\(--safe-bottom\) - 5px\)\)\s*!important;/);
  assert.match(mobileCss, /html\.native-ios-shell \.play-feed__author-row\s*\{[^}]*margin-top:\s*6px\s*!important;/);
});

test('iOS My screen paints the home-indicator safe area white without changing dark mode', () => {
  assert.match(mobileEntry, /s\.screen==='me'\?'is-secondary-screen is-me-screen':'is-secondary-screen'/);
  assert.match(mobileCss, /html\.native-app-shell \.app-shell\.is-me-screen:not\(\.theme-dark\)::before\s*\{[^}]*height:\s*var\(--safe-bottom\);[^}]*background:\s*#fff;/);
});

test('Flutter iOS runs the same native UI as Android instead of a WebView shell', () => {
  // iOS 曾经在 main.dart 里短路成 WebView 壳，Flutter 原生 UI 完全不执行。
  assert.doesNotMatch(flutterMain, /TargetPlatform\.iOS/);
  assert.doesNotMatch(flutterMain, /IosAndroidParityApp/);
  assert.match(flutterMain, /runApp\(const ProviderScope\(child: AirvanaApp\(\)\)\)/);
  assert.equal(flutterWebParityShellExists, false);
  // public/ 不再整份复制进 IPA：同一批街机资源已经在 flutter_assets 里。
  assert.doesNotMatch(flutterIosProject, /Sync Android Web Baseline/);
  assert.doesNotMatch(flutterIosProject, /rsync -a --delete/);
});

test('iOS game WebViews allow inline autoplay and the asset server answers Range requests', () => {
  // WKWebView 默认禁止自动播放且强制视频全屏；Android 的 Chromium 没有这两个限制，
  // 所以这两条只在 iOS 上决定游戏有没有声音。
  assert.match(gameWebView, /allowsInlineMediaPlayback: true/);
  assert.match(gameWebView, /mediaTypesRequiringUserAction: const <PlaybackMediaTypes>\{\}/);
  // iOS 的 AVFoundation 会先发 Range 探测并要求 206，否则音频判定为不可播放。
  assert.match(assetServer, /Accept-Ranges/);
  assert.match(assetServer, /HttpStatus\.partialContent/);
  assert.match(assetServer, /Content-Range/);
  assert.match(assetServer, /headers\.contentLength/);
});
