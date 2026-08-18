import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const webContainer = fs.readFileSync(path.join(root, 'ios-demo/AirvanaDemo/AirvanaWebContainer.swift'), 'utf8');
const projectConfig = fs.readFileSync(path.join(root, 'ios-demo/project.yml'), 'utf8');
const installScript = fs.readFileSync(path.join(root, 'ios-demo/install-on-device.sh'), 'utf8');
const mobileEntry = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const mobileCss = fs.readFileSync(path.join(root, 'public/airvana-v4.css'), 'utf8');
const infoPlist = fs.readFileSync(path.join(root, 'ios-demo/AirvanaDemo/Info.plist'), 'utf8');

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
