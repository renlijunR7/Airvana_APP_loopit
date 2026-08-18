import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const source = fs.readFileSync(path.join(root, 'docs/legal/privacy-policy-2026-08-11.md'), 'utf8')
  .replace(/\r/g, '')
  .trimEnd();
const runtime = fs.readFileSync(path.join(root, 'public/legal-privacy-v1.js'), 'utf8');

test('privacy policy runtime preserves the approved source verbatim', () => {
  const sandbox = {window: {}};
  vm.runInNewContext(runtime, sandbox);
  const document = sandbox.window.AirvanaPrivacyPolicyV1;

  assert.equal(document.title, 'Privacy Policy / 隐私政策');
  assert.equal(document.effectiveDate, 'Aug 11th, 2026');
  assert.equal(document.sections.length, 13);

  const rebuilt = [
    'Privacy Policy',
    `Last Updated: ${document.effectiveDate}`,
    document.preamble,
    ...document.sections.map(([title, body], index) => `${index + 1}. ${title}\n${body}`)
  ].join('\n');

  assert.equal(rebuilt, source);
  assert.match(document.draftNote, /\[AIRVANA CONTACT EMAIL\]/);
});
