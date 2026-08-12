import { HttpError } from './utils.mjs';

const CONTENT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'summary', 'hook', 'sections', 'interactions', 'assets', 'safetyNotes'],
  properties: {
    title: { type: 'string' },
    summary: { type: 'string' },
    hook: { type: 'string' },
    sections: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['heading', 'body'], properties: { heading: { type: 'string' }, body: { type: 'string' } } } },
    interactions: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['trigger', 'result'], properties: { trigger: { type: 'string' }, result: { type: 'string' } } } },
    assets: { type: 'array', items: { type: 'string' } },
    safetyNotes: { type: 'array', items: { type: 'string' } },
  },
};

const LOCAL_BLOCK_PATTERNS = [
  { code: 'financial_guarantee', label: '收益或回报保证', re: /(保本|稳赚|保证收益|零风险赚钱|必赚|100%收益)/i },
  { code: 'credential_phishing', label: '索取私钥或助记词', re: /(私钥|助记词|seed phrase).{0,12}(发送|输入|提交|提供)/i },
  { code: 'hate_or_violence', label: '仇恨或暴力指令', re: /(杀死|灭绝|仇恨).{0,12}(群体|种族|民族|宗教)/i },
  { code: 'malware', label: '恶意软件或盗取凭证', re: /(盗号|木马|恶意软件|窃取密码|绕过验证)/i },
];

function localGenerate({ contentType, title, prompt, agent }) {
  const cleanTitle = title || prompt.slice(0, 22) || 'Agent 内容草稿';
  const typeNames = { game: '互动游戏', video: '互动故事', article: '深度文章' };
  const interaction = contentType === 'game'
    ? [{ trigger: '点击开始', result: '进入 60 秒互动挑战' }, { trigger: '完成核心目标', result: '展示成绩与分享卡片' }]
    : contentType === 'video'
      ? [{ trigger: '播放至 50%', result: '展示互动选择题' }, { trigger: '完成播放', result: '解锁内容总结' }]
      : [{ trigger: '阅读至核心观点', result: '展示观点投票' }, { trigger: '阅读完成', result: '生成可收藏摘要' }];
  return {
    title: cleanTitle,
    summary: `${agent.name} 根据创作目标生成的${typeNames[contentType]}方案。`,
    hook: prompt.slice(0, 90),
    sections: [
      { heading: '开场', body: `用清晰的视觉钩子呈现主题：${cleanTitle}。` },
      { heading: '核心内容', body: prompt },
      { heading: '结束与行动', body: '以非诱导方式邀请用户收藏、分享或继续探索相关内容。' },
    ],
    interactions: interaction,
    assets: ['封面视觉', '品牌安全背景素材', contentType === 'video' ? '旁白与字幕' : '交互反馈组件'],
    safetyNotes: ['不包含收益保证', '不索取钱包私钥或助记词', '发布前需要内容所有者确认'],
  };
}

function extractResponseText(data) {
  if (typeof data.output_text === 'string') return data.output_text;
  for (const item of data.output || []) {
    for (const part of item.content || []) {
      if (part.type === 'output_text' && part.text) return part.text;
    }
  }
  throw new Error('外部 AI 生成服务未返回结构化文本');
}

async function openAiGenerate(config, input) {
  const response = await fetch(`${config.baseUrl}/responses`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.model,
      instructions: '你是 Airvana 内容 Agent。输出可执行且品牌安全的内容方案，不得承诺收益，不得要求私钥、助记词或钱包转账。',
      input: `内容类型：${input.contentType}\n标题：${input.title}\nAgent 约束：${input.agent.systemPrompt || '无额外约束'}\n用户目标：${input.prompt}`,
      text: { format: { type: 'json_schema', name: 'airvana_content', strict: true, schema: CONTENT_SCHEMA } },
    }),
    signal: AbortSignal.timeout(config.timeoutMs),
  });
  if (!response.ok) throw new Error(`OpenAI 内容生成失败：HTTP ${response.status}`);
  return JSON.parse(extractResponseText(await response.json()));
}

async function openAiModerate(config, text) {
  const response = await fetch(`${config.baseUrl}/moderations`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: config.moderationModel, input: text }),
    signal: AbortSignal.timeout(config.timeoutMs),
  });
  if (!response.ok) throw new Error(`OpenAI 审核失败：HTTP ${response.status}`);
  const result = (await response.json()).results?.[0];
  const hits = Object.entries(result?.categories || {}).filter(([, flagged]) => flagged).map(([code]) => code);
  return { passed: !result?.flagged, provider: 'openai', hits, raw: { flagged: Boolean(result?.flagged), categoryScores: result?.category_scores || {} } };
}

export function createAiService(env = process.env) {
  const apiKey = env.OPENAI_API_KEY || '';
  const provider = apiKey && env.AI_PROVIDER !== 'local' ? 'openai' : 'local';
  const config = {
    apiKey,
    provider,
    baseUrl: (env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, ''),
    model: env.OPENAI_MODEL || 'gpt-5-mini',
    moderationModel: env.OPENAI_MODERATION_MODEL || 'omni-moderation-latest',
    timeoutMs: Number(env.AI_TIMEOUT_MS || 45_000),
  };

  return {
    info: { provider, model: provider === 'openai' ? config.model : 'airvana-local-structured-v1', external: provider === 'openai' },

    async generate(input) {
      if (!['game', 'video', 'article'].includes(input.contentType)) throw new HttpError(400, '不支持的内容类型');
      const payload = provider === 'openai' ? await openAiGenerate(config, input) : localGenerate(input);
      return { provider, payload };
    },

    async moderate(input) {
      const text = typeof input === 'string' ? input : JSON.stringify(input);
      const localHits = LOCAL_BLOCK_PATTERNS.filter(rule => rule.re.test(text)).map(rule => ({ code: rule.code, label: rule.label }));
      const local = { passed: localHits.length === 0, provider: 'local-policy', hits: localHits, checkedAt: new Date().toISOString() };
      if (!local.passed || provider !== 'openai') return { passed: local.passed, checks: [local], provider: 'local-policy' };
      const external = await openAiModerate(config, text);
      return { passed: external.passed, checks: [local, external], provider: 'local-policy+openai' };
    },
  };
}
