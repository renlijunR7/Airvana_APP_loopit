import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const required = ['server.mjs','src/app.mjs','src/db.mjs','src/ai.mjs','src/worker.mjs','src/artifact.mjs','public/index.html','public/app.css','public/app.js','public/ui.js','README.md'];
for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing required file: ${file}`);
}

const app = fs.readFileSync(path.join(root, 'src/app.mjs'), 'utf8');
const frontend = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'public/ui.js'), 'utf8');
const artifact = fs.readFileSync(path.join(root, 'src/artifact.mjs'), 'utf8');
const checks = [
  ['wallet challenge', app.includes('/api/auth/wallet/challenge') && app.includes('verifyMessage')],
  ['server ledger', app.includes('point_events') && app.includes('engagement_events')],
  ['campaign workflow', app.includes('platform-review') && app.includes('deliverables') && app.includes('settlements')],
  ['artifact builder', app.includes('saveArtifact') && app.includes("'/content/:id'")],
  ['runtime proof', app.includes('/api/runtime/sessions') && app.includes('/api/runtime/events')],
  ['risk governance', app.includes('risk-cases') && app.includes('content-reports')],
  ['content appeal governance', app.includes('/api/content-appeals') && app.includes('/content-appeals/:id/resolve')],
  ['Agent runtime controls', app.includes('agent-runtime') && app.includes('/cancel') && app.includes('/retry')],
  ['campaign governance', app.includes('/participants/:creatorId/review') && app.includes('/status') && app.includes('platform-approve')],
  ['campaign attribution and invite consent', app.includes('attribution_touches') && app.includes('invite-response')],
  ['campaign editing and budget summary', app.includes("req.method === 'PATCH'") && app.includes('budgetSummary') && frontend.includes('campaign-edit')],
  ['version restore and artifact rebuild', app.includes('/versions/:version/restore') && app.includes('version_restored')],
  ['AIP utility and ledger governance', app.includes('/boost') && app.includes('/point-events/:id/status')],
  ['session and deletion controls', app.includes('/api/account/sessions') && app.includes('/deletion-request/:id/cancel')],
  ['account rights', app.includes('/api/account/export') && app.includes('/api/account/deletion-request') && app.includes('/api/terms/accept')],
  ['permission enforcement', app.includes('validateAgentForTask')],
  ['frontend wallet login', frontend.includes('personal_sign')],
  ['frontend role workspaces', frontend.includes('Campaign 工作台') && frontend.includes('平台审核')],
  ['deliverable evidence', frontend.includes('deliverable-evidence') && frontend.includes('artifactValidation')],
  ['Agent run audit timeline', frontend.includes('输入 / 输出证据') && frontend.includes('旧任务兼容记录')],
  ['responsive primary navigation', frontend.includes('primaryNav = nav.slice(0, 4)') && frontend.includes('mobile-more-menu')],
  ['Campaign complete contract', ['audience','channel','conversionGoal','successMetric','brandAssets','optimizableFields','ctaLabel','ctaUrl'].every(field => frontend.includes(field))],
  ['Agent memory CRUD', app.includes('/api/agent-memory/:id') && frontend.includes('agent-memory-edit') && frontend.includes('agent-memory-delete')],
  ['settlement trail and export', app.includes('settlement_approvals') && frontend.includes('settlement-export') && frontend.includes('settlement-details')],
  ['notification management', app.includes('/api/notifications/read-all') && frontend.includes('notification-filter') && frontend.includes('notification-open')],
  ['structured content editor', frontend.includes('data-content-preview') && frontend.includes("name:'safetyNotes'") && frontend.includes("name:'interactions'")],
  ['accessible dialogs', ui.includes("event.key === 'Escape'") && ui.includes('previousFocus.focus()') && ui.includes("event.key !== 'Tab'")],
  ['artifact completion actions', ['重新体验','返回内容广场','保存到本设备','分享 / 复制链接'].every(text => artifact.includes(text))],
  ['terminology alignment', frontend.includes('互动故事') && !frontend.includes('短视频') && frontend.includes('运行记录')],
];
for (const [name, ok] of checks) if (!ok) throw new Error(`Verification failed: ${name}`);
console.log(`Airvana v5.3 P0/P1/P2 structural verification passed (${checks.length} checks)`);
