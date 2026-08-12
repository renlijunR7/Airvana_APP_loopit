import test from 'node:test';
import assert from 'node:assert/strict';
import { buildArtifact } from '../src/artifact.mjs';

const content = type => ({ id: `content-${type}`, title: `${type} artifact`, content_type: type });
const validPayload = type => ({
  title: `${type} artifact`,
  summary: 'A complete and safe interactive experience.',
  hook: 'Start with one clear action.',
  sections: [
    { heading: 'First step', body: 'Understand the situation and choose a safe response.' },
    { heading: 'Second step', body: 'Complete the action and review the outcome.' },
  ],
  interactions: [{ trigger: 'User chooses the safe response', result: 'Show a verified learning outcome' }],
  assets: [{ type: 'generated-visual', description: 'Runtime visual treatment' }],
  safetyNotes: ['Do not request private keys or promise financial returns.'],
});

for (const type of ['game', 'video', 'article']) {
  test(`${type} artifacts pass complete schema and runtime validation`, () => {
    const result = buildArtifact({ content: content(type), payload: validPayload(type), version: 1 });
    assert.equal(result.validation.passed, true);
    assert.match(result.html, /playable_start/);
    assert.match(result.html, /step_complete/);
    assert.match(result.html, /playable_complete/);
    assert.match(result.html, /重新体验/);
    assert.match(result.html, /返回内容广场/);
    assert.match(result.html, /保存到本设备/);
    assert.match(result.html, /分享 \/ 复制链接/);
    assert.deepEqual(result.manifest.requiredEvents, ['playable_start', 'step_complete', 'playable_complete']);
    assert.deepEqual(result.manifest.completionActions, ['replay', 'return', 'save', 'share', 'optional_cta']);
  });
}

test('artifact validation rejects incomplete section and interaction shapes', () => {
  const payload = validPayload('game');
  payload.sections = [{ heading: '', body: 'Missing a heading' }];
  payload.interactions = [{ trigger: 'Click', result: '' }];
  const result = buildArtifact({ content: content('game'), payload, version: 1 });
  assert.equal(result.validation.passed, false);
  assert.equal(result.validation.checks.find(check => check.id === 'sections').passed, false);
  assert.equal(result.validation.checks.find(check => check.id === 'interactions').passed, false);
});
