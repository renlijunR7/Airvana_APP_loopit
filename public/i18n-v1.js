(function (root) {
  'use strict';

  // Airvana 国际化基础设施。
  // 边界：中文是基准语言（key 缺失时回落中文原文），迁移按关键路径分批推进，
  // 未迁移文案继续以中文硬编码存在且不受影响。
  const STORAGE_KEY = 'airvana.locale';
  const DEFAULT_LOCALE = 'zh-CN';
  const SUPPORTED = ['zh-CN', 'en-US'];

  const MESSAGES = {
    'zh-CN': {},   // 基准语言：直接使用 key 中的中文原文
    'en-US': {
      // ---- 登录与身份 ----
      '登录，开始运营属于你的': 'Sign in to run your own',
      'Google 一键登录': 'Continue with Google',
      '数字货币钱包登录': 'Connect crypto wallet',
      '邮箱验证码登录': 'Sign in with email code',
      '发送验证码': 'Send code',
      '请输入有效邮箱地址，例如 name@example.com。': 'Enter a valid email address, for example name@example.com.',
      '验证码不正确，请重新输入。': 'That code is incorrect. Try again.',
      '验证码已过期，请重新发送。': 'That code expired. Send a new one.',
      '退出登录': 'Sign out',
      '钱包仅使用签名验证；Airvana 不会索取助记词或私钥': 'Wallet sign-in uses a signature only. Airvana never asks for your seed phrase or private key.',

      // ---- 创作与发布 ----
      '开始完整试玩': 'Play full experience',
      '进入创作': 'Start creating',
      '确认并开始创作': 'Confirm and create',
      '人工审核通过': 'Approve review',
      '发布服务端作品': 'Publish to server',
      '存草稿': 'Save draft',
      '服务端创作管线': 'Server creation pipeline',
      '待人工审核': 'Awaiting review',
      '审核通过 · 待发布': 'Approved · ready to publish',
      '已发布': 'Published',
      '生成中': 'Generating',
      '排队中': 'Queued',
      '生成失败': 'Generation failed',

      // ---- 经济与结算 ----
      'AIP 可用积分': 'Available AIP',
      '余额不足': 'Insufficient balance',
      '已生效': 'Active',
      '签到成功': 'Checked in',
      'AIT Campaign 权益': 'AIT campaign entitlements',
      '不可转让 · 不可直接提现 · 按 Contract 申领或结算': 'Non-transferable · no direct withdrawal · claimed or settled per contract',
      '申领权益': 'Claim benefit',
      '申请付款结算': 'Request payment settlement',
      '申诉': 'Appeal',

      // ---- 社交与消息 ----
      '关注': 'Follow',
      '已关注': 'Following',
      '收藏': 'Save',
      '分享': 'Share',
      '评论': 'Comments',
      '发送': 'Send',
      '通知': 'Notifications',
      '互动': 'Activity',
      '私信': 'Messages',
      '服务端私信': 'Server message',
      '私信已撤回': 'Message recalled',
      '还没有消息 · 发送第一条服务端私信': 'No messages yet — send the first one.',

      // ---- 导航与通用状态 ----
      '首页': 'Home',
      '发现': 'Discover',
      '节点': 'Network',
      '消息': 'Inbox',
      '我的': 'Profile',
      '创作游戏': 'Create',
      '获赞': 'Likes',
      '粉丝': 'Followers',
      '加载中': 'Loading',
      '暂无内容': 'Nothing here yet',
      '出现错误': 'Something went wrong',
      '当前为离线模式': 'You are offline',
      '权限不足': 'Not permitted',
      '重试': 'Retry',
      '取消': 'Cancel',
      '确认': 'Confirm',
      '关闭': 'Close',
    },
  };

  function detect() {
    try {
      const saved = root.localStorage && root.localStorage.getItem(STORAGE_KEY);
      if (saved && SUPPORTED.includes(saved)) return saved;
    } catch (error) { /* 存储不可用时回退检测 */ }
    const nav = (root.navigator && (root.navigator.language || (root.navigator.languages || [])[0])) || DEFAULT_LOCALE;
    return String(nav).toLowerCase().startsWith('en') ? 'en-US' : DEFAULT_LOCALE;
  }

  let locale = detect();
  const listeners = new Set();

  function t(key, fallback) {
    if (locale === DEFAULT_LOCALE) return fallback === undefined ? key : fallback;
    const table = MESSAGES[locale] || {};
    if (Object.hasOwn(table, key)) return table[key];
    return fallback === undefined ? key : fallback;   // 未迁移文案保持中文原文，不显示空白或 key
  }

  function setLocale(next) {
    if (!SUPPORTED.includes(next) || next === locale) return locale;
    locale = next;
    try { if (root.localStorage) root.localStorage.setItem(STORAGE_KEY, next); } catch (error) { /* 忽略 */ }
    try { if (root.document) root.document.documentElement.lang = next; } catch (error) { /* 忽略 */ }
    listeners.forEach(fn => { try { fn(next); } catch (error) { /* 单个监听失败不影响其他 */ } });
    return locale;
  }

  function onChange(fn) {
    if (typeof fn === 'function') listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function coverage() {
    const table = MESSAGES['en-US'];
    return { locale, supported: [...SUPPORTED], translatedKeys: Object.keys(table).length };
  }

  try { if (root.document) root.document.documentElement.lang = locale; } catch (error) { /* 忽略 */ }

  root.AirvanaI18n = {
    t,
    setLocale,
    onChange,
    coverage,
    get locale() { return locale; },
    get supported() { return [...SUPPORTED]; },
    MESSAGES,
    DEFAULT_LOCALE,
  };
})(typeof window !== 'undefined' ? window : globalThis);
