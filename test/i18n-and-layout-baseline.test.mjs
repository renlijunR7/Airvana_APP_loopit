import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const mobileEntry = read('public/index.html');
const i18nSource = read('public/i18n-v1.js');

function loadI18n() {
  const sandbox = { navigator: { language: 'zh-CN' }, localStorage: null, document: null };
  new Function('window', 'globalThis', i18nSource)(sandbox, sandbox);
  return sandbox.AirvanaI18n;
}

// ===== G-08 国际化 =====

test('i18n falls back to Chinese source text and never renders raw keys or blanks', () => {
  const i18n = loadI18n();
  assert.equal(i18n.locale, 'zh-CN');
  assert.equal(i18n.t('首页'), '首页');
  // 未迁移的任意文案：基准语言原样返回
  assert.equal(i18n.t('某个尚未迁移的长文案'), '某个尚未迁移的长文案');

  i18n.setLocale('en-US');
  assert.equal(i18n.locale, 'en-US');
  assert.equal(i18n.t('首页'), 'Home');
  assert.equal(i18n.t('发布服务端作品'), 'Publish to server');
  // 英文包缺失的 key 回落中文原文，不出现空串或 key 泄漏
  const missing = i18n.t('某个尚未迁移的长文案');
  assert.equal(missing, '某个尚未迁移的长文案');
  assert.notEqual(missing, '');
});

test('i18n rejects unsupported locales and notifies subscribers on change', () => {
  const i18n = loadI18n();
  const seen = [];
  const off = i18n.onChange(next => seen.push(next));
  assert.equal(i18n.setLocale('fr-FR'), 'zh-CN', '不支持的语言不应生效');
  assert.deepEqual(seen, []);
  i18n.setLocale('en-US');
  assert.deepEqual(seen, ['en-US']);
  i18n.setLocale('en-US');
  assert.deepEqual(seen, ['en-US'], '重复设置同一语言不应重复通知');
  off();
  i18n.setLocale('zh-CN');
  assert.deepEqual(seen, ['en-US'], '取消订阅后不再收到通知');
});

test('i18n covers the key user paths and is wired into the mobile entry', () => {
  const i18n = loadI18n();
  i18n.setLocale('en-US');
  const keyPaths = ['Google 一键登录', '邮箱验证码登录', '开始完整试玩', '人工审核通过', '发布服务端作品', 'AIP 可用积分', '关注', '私信', '首页', '我的'];
  for (const key of keyPaths) {
    assert.notEqual(i18n.t(key), key, `关键路径文案未翻译：${key}`);
  }
  assert.ok(i18n.coverage().translatedKeys >= 50, '英文包至少覆盖 50 条关键文案');

  assert.match(mobileEntry, /i18n-v1\.js\?v=1\.0\.0/);
  assert.match(mobileEntry, /label:this\.t\('首页'\)/);
  assert.match(mobileEntry, /switchLocale\(next\)/);
  assert.match(mobileEntry, /localeOptions:/);
});

// ===== G-05 布局回归基线（结构断言版：无需截图基础设施即可防漂移）=====

const LAYOUT_BASELINE = {
  // 手机壳在三档常见视口下的响应式规则必须存在
  viewports: ['max-width:430px', 'min-width:431px'],
  // 安全区适配：顶部、底部导航、抽屉、弹层
  safeArea: ['env(safe-area-inset-top', 'env(safe-area-inset-bottom'],
  // 触控目标与可访问性下限
  touchTargets: ['min-height:44px', 'min-height:46px'],
};

test('layout baseline: responsive shell, safe areas and touch targets stay present', () => {
  for (const rule of LAYOUT_BASELINE.viewports) {
    assert.ok(mobileEntry.includes(rule), `响应式断点缺失：${rule}`);
  }
  for (const rule of LAYOUT_BASELINE.safeArea) {
    assert.ok(mobileEntry.includes(rule), `安全区适配缺失：${rule}`);
  }
  assert.ok(LAYOUT_BASELINE.touchTargets.some(rule => mobileEntry.includes(rule)), '触控目标下限缺失');
});

test('layout baseline: feed windowing and overlay layering do not regress', () => {
  // Feed 只挂载当前与相邻项（UI-006）
  assert.match(mobileEntry, /windowClass:i===safePlayIdx\?'is-active':'is-buffered'/);
  assert.match(mobileEntry, /ariaHidden:String\(i!==safePlayIdx\)/);
  // 覆盖层层级：运行容器 < 私信，二者都在内容之上
  const runtimeLayer = Number(/server-artifact-overlay[\s\S]{0,200}?z-index:(\d+)/.exec(mobileEntry)?.[1] || 0);
  const dmLayer = Number(/server-dm-overlay[\s\S]{0,200}?z-index:(\d+)/.exec(mobileEntry)?.[1] || 0);
  assert.ok(runtimeLayer >= 100, '运行容器层级过低');
  assert.ok(dmLayer > runtimeLayer, '私信覆盖层应位于运行容器之上');
});

test('layout baseline: template placeholders never leak into rendered attributes', () => {
  // 模板必须整体包在惰性容器里，避免 {{ }} 被浏览器当作真实 src/path 解析
  assert.match(mobileEntry, /<x-dc>\s*<template data-dc-inert>/);
  assert.match(mobileEntry, /<\/template>\s*<\/x-dc>/);
  // 内联脚本必须外置（CSP 下内联会被拦截）
  const inlineScripts = mobileEntry.split('\n').filter(line => line.trim() === '<script>');
  assert.equal(inlineScripts.length, 0, '不得新增内联脚本：CSP 会拦截，须放入 boot.js');
});

test('layout baseline: static MIME table serves every shipped image format', () => {
  const app = read('src/app.mjs');
  const shipped = new Set();
  const walk = dir => {
    for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const next = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(next);
      else {
        const ext = path.extname(entry.name).toLowerCase();
        if (['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.avif'].includes(ext)) shipped.add(ext);
      }
    }
  };
  walk('public/assets');
  for (const ext of shipped) {
    assert.ok(app.includes(`'${ext}':`), `静态 MIME 表缺少 ${ext}：nosniff 下浏览器将拒绝解码`);
  }
});
