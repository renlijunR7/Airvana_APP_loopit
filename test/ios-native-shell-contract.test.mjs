import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const webContainer = fs.readFileSync(path.join(root, 'ios-demo/AirvanaDemo/AirvanaWebContainer.swift'), 'utf8');
const projectConfig = fs.readFileSync(path.join(root, 'ios-demo/project.yml'), 'utf8');
const installScript = fs.readFileSync(path.join(root, 'ios-demo/install-on-device.sh'), 'utf8');

test('iOS native shell removes the gray input assistant and keeps the keyboard until an explicit outside tap', () => {
  assert.match(webContainer, /inputAssistantItem\.leadingBarButtonGroups = \[\]/);
  assert.match(webContainer, /inputAssistantItem\.trailingBarButtonGroups = \[\]/);
  assert.match(webContainer, /keyboardDismissMode = \.none/);
});

test('iOS native shell exposes the new physical-device build metadata', () => {
  assert.match(webContainer, /AirvanaLoopit\/1\.0\.11 \(iOS; WKWebView\)/);
  assert.match(webContainer, /native-version=1\.0\.11&native-build=13/);
  assert.match(projectConfig, /DEVELOPMENT_TEAM: AFPAHT853U/);
  assert.match(installScript, /TEAM_ID="\$\(sed -n/);
});
