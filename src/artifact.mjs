import { isoNow, jsonString, uid } from './utils.mjs';

const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
const safeData = value => JSON.stringify(value).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e').replaceAll('&', '\\u0026');

function bodyFor(type) {
  if (type === 'game') return `
    <section class="stage" id="experience"><div class="game-orb" id="orb">🛡️</div><h2 id="step-title">准备接受互动挑战</h2><p id="step-body">开始后完成两个行动检查，系统才会记录有效完成。</p><div class="choices" id="choices"></div></section>`;
  if (type === 'video') return `
    <section class="stage" id="experience"><div class="video-frame"><div class="video-art" id="video-art">◉</div><div class="video-caption" id="video-caption">点击开始播放互动故事</div><div class="timeline"><span id="timeline"></span></div></div><div class="choices" id="choices"></div></section>`;
  return `
    <article class="article" id="experience"><div id="article-sections"></div><div class="choices" id="choices"></div></article>`;
}

export function buildArtifact({ content, payload, version }) {
  const type = content.content_type;
  const typeName = { game: '互动游戏', video: '互动故事', article: '文章' }[type] || type;
  const title = payload.title || content.title;
  const manifest = {
    schema: 'airvana.artifact.v1', contentId: content.id, version, type, title,
    requiredEvents: ['playable_start', 'step_complete', 'playable_complete'],
    generatedAt: isoNow(), responsive: true, standalone: true, completionActions: ['replay', 'return', 'save', 'share', 'optional_cta'],
  };
  const text = value => typeof value === 'string' && value.trim().length > 0;
  const validSections = Array.isArray(payload.sections) && payload.sections.length >= 2
    && payload.sections.every(section => section && typeof section === 'object' && text(section.heading) && text(section.body));
  const validInteractions = Array.isArray(payload.interactions) && payload.interactions.length >= 1
    && payload.interactions.every(item => item && typeof item === 'object' && text(item.trigger) && text(item.result));
  const checks = [
    { id: 'content-type', passed: ['game', 'video', 'article'].includes(type), note: 'Supported artifact runtime' },
    { id: 'title', passed: text(title) },
    { id: 'summary', passed: text(payload.summary) || text(payload.hook) },
    { id: 'sections', passed: validSections, note: 'At least two complete heading/body sections' },
    { id: 'interactions', passed: validInteractions, note: 'At least one complete trigger/result interaction' },
    { id: 'assets', passed: Array.isArray(payload.assets) && payload.assets.length >= 1 },
    { id: 'safety-notes', passed: Array.isArray(payload.safetyNotes) && payload.safetyNotes.length >= 1 },
    { id: 'runtime-events', passed: manifest.requiredEvents.join('>') === 'playable_start>step_complete>playable_complete' },
    { id: 'external-scripts', passed: true, note: 'No external scripts' },
  ];
  const validation = { passed: checks.every(check => check.passed), checks };
  const data = safeData({ contentId: content.id, type, title, payload });
  const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#111512"><title>${escapeHtml(title)} · Airvana</title><style>
  :root{font-family:Inter,-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;color:#f7f7f4;background:#0e120f}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at 70% 0,#4e1720 0,transparent 38%),#0e120f}.shell{width:min(760px,100%);min-height:100vh;margin:auto;padding:28px clamp(18px,5vw,48px) 46px;display:flex;flex-direction:column}.brand{display:flex;gap:9px;align-items:center;font-weight:900}.mark{width:28px;height:28px;border-radius:8px;background:#ff4352;display:grid;place-items:center}.hero{padding:9vh 0 5vh}.type{color:#ff7f89;letter-spacing:.15em;font-size:11px;font-weight:900}.hero h1{font-size:clamp(35px,8vw,70px);line-height:.98;letter-spacing:-.055em;margin:14px 0 18px}.hero p{max-width:620px;color:#b8c0ba;line-height:1.7}.start,.result-actions button,.result-actions a{border:0;border-radius:999px;background:#ff4352;color:white;padding:14px 22px;font-weight:900;font-size:15px;text-decoration:none;cursor:pointer}.start:disabled{opacity:.45}.stage,.article{display:none;background:#191e1a;border:1px solid #303731;border-radius:22px;padding:clamp(20px,5vw,40px);min-height:300px}.stage.live,.article.live{display:block}.game-orb{font-size:76px;filter:drop-shadow(0 18px 34px rgba(255,67,82,.25));margin-bottom:20px}.choices{display:grid;gap:10px;margin-top:25px}.choices button{border:1px solid #3a443c;background:#232a25;color:white;border-radius:13px;padding:14px;text-align:left;font-weight:750}.choices button:hover{border-color:#ff4352}.video-frame{border-radius:18px;background:linear-gradient(145deg,#252d27,#131713);padding:30px;min-height:300px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center}.video-art{font-size:92px;color:#ff5260;animation:pulse 2s ease-in-out infinite}.video-caption{font-size:18px;font-weight:850;margin:22px}.timeline{width:100%;height:6px;background:#333a35;border-radius:9px;overflow:hidden}.timeline span{display:block;width:0;height:100%;background:#ff4352;transition:width .35s}.article{color:#dfe4e0}.article section{border-bottom:1px solid #303731;padding:12px 0 23px}.article h2{color:white}.article p{line-height:1.8}.result{display:none;border:1px solid #254b35;background:#14271b;border-radius:18px;padding:24px;margin-top:18px}.result.show{display:block}.result>strong{font-size:24px;color:#78e9a3}.result-actions{display:flex;flex-wrap:wrap;gap:9px;margin-top:18px}.result-actions button.secondary,.result-actions a.secondary{background:#26332a}.result-actions a.cta{background:#78e9a3;color:#102016}.result-status{min-height:20px;color:#b8c0ba;font-size:12px;margin-top:10px}.runtime{font-size:10px;color:#7f8982;margin-top:auto;padding-top:25px}.error{color:#ff8f98;font-size:12px}@keyframes pulse{50%{transform:scale(1.08);opacity:.7}}@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
  </style></head><body><main class="shell"><div class="brand"><span class="mark">A</span>airvana.ai</div><header class="hero"><div class="type">${escapeHtml(typeName)} · Agent 驱动内容</div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(payload.summary || payload.hook || '')}</p><button id="start" class="start">开始体验</button><div id="error" class="error" role="alert"></div></header>${bodyFor(type)}<div class="result" id="result"><strong>体验完成</strong><p>服务器已验证完整行为顺序。符合资格的互动将进入 AIP 账本。</p><div class="result-actions"><button id="replay" class="secondary">重新体验</button><a class="secondary" href="/">返回内容广场</a><button id="save" class="secondary">保存到本设备</button><button id="share" class="secondary">分享 / 复制链接</button><a id="cta" class="cta" href="#" target="_blank" rel="noopener" hidden></a></div><div id="result-status" class="result-status" role="status" aria-live="polite"></div></div><div class="runtime">Airvana 运行时 · 版本 ${version} · 事件证明已启用</div></main><script>
  const DATA=${data};let sessionToken=null;let sequence=1;let checkpointSent=false;const $=s=>document.querySelector(s);
  async function api(path,body){const r=await fetch(path,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-Airvana-Device':localStorage.airvana_device_id||(localStorage.airvana_device_id=crypto.randomUUID())},body:JSON.stringify(body)});const j=await r.json();if(!r.ok)throw new Error(j.error?.message||'请求失败');return j}
  async function event(type,payload={}){const result=await api('/api/runtime/events',{sessionToken,sequence,eventType:type,payload});sequence+=1;return result}
  function fail(e){$('#error').textContent=e.message||String(e)}
  async function complete(){await event('playable_complete',{completed:true});$('#result').classList.add('show');$('#choices').innerHTML='';$('#result').scrollIntoView({behavior:'smooth',block:'center'});}
  function renderGame(){const steps=(DATA.payload.sections||[]).slice(0,2);let i=0;const draw=()=>{const s=steps[i]||{heading:'完成',body:'已完成核心体验'};$('#step-title').textContent=s.heading;$('#step-body').textContent=s.body;$('#choices').innerHTML='<button id="choice">完成这个行动检查</button>';$('#choice').onclick=async()=>{try{if(!checkpointSent){await event('step_complete',{step:i+1});checkpointSent=true;i++;draw()}else await complete()}catch(e){fail(e)}}};draw()}
  function renderVideo(){const scenes=(DATA.payload.sections||[]).slice(0,3);let i=0;const next=async()=>{if(i>=scenes.length){await complete();return}const s=scenes[i];$('#video-caption').textContent=s.heading+' · '+s.body;$('#timeline').style.width=((i+1)/scenes.length*100)+'%';if(!checkpointSent&&i>=Math.floor(scenes.length/2)){await event('step_complete',{scene:i+1});checkpointSent=true}i++;$('#choices').innerHTML='<button id="next">继续播放下一幕</button>';$('#next').onclick=()=>next().catch(fail)};next().catch(fail)}
  function renderArticle(){const sections=DATA.payload.sections||[];$('#article-sections').innerHTML=sections.map(s=>'<section><h2>'+escapeText(s.heading)+'</h2><p>'+escapeText(s.body)+'</p></section>').join('');$('#choices').innerHTML='<button id="read">确认已阅读核心内容</button>';$('#read').onclick=async()=>{try{await event('step_complete',{sections:sections.length});checkpointSent=true;$('#choices').innerHTML='<button id="finish">完成阅读</button>';$('#finish').onclick=()=>complete().catch(fail)}catch(e){fail(e)}}}
  function escapeText(v){const d=document.createElement('div');d.textContent=v||'';return d.innerHTML}
  $('#replay').onclick=()=>location.reload();
  $('#save').onclick=()=>{const key='airvana_saved_contents';const saved=new Set(JSON.parse(localStorage.getItem(key)||'[]'));saved.add(DATA.contentId);localStorage.setItem(key,JSON.stringify([...saved]));$('#result-status').textContent='已保存到本设备；此操作不产生积分。'};
  $('#share').onclick=async()=>{try{if(navigator.share)await navigator.share({title:DATA.title,url:location.href});else{await navigator.clipboard.writeText(location.href);$('#result-status').textContent='成品链接已复制。'}}catch(e){if(e.name!=='AbortError')$('#result-status').textContent='分享失败，请复制浏览器地址。'}};
  if(DATA.payload.ctaUrl){try{const url=new URL(DATA.payload.ctaUrl,location.href);if(['http:','https:'].includes(url.protocol)){const cta=$('#cta');cta.href=url.href;cta.textContent=DATA.payload.ctaLabel||'继续了解';cta.hidden=false}}catch{}}
  $('#start').onclick=async()=>{try{const query=new URLSearchParams(location.search);const s=await api('/api/runtime/sessions',{contentId:DATA.contentId,campaignId:query.get('campaign'),ref:query.get('ref')});sessionToken=s.sessionToken;await event('playable_start',{artifactVersion:${version}});$('#start').disabled=true;$('#experience').classList.add('live');if(DATA.type==='game')renderGame();else if(DATA.type==='video')renderVideo();else renderArticle()}catch(e){fail(e)}};
  </script></body></html>`;
  return { html, manifest, validation };
}

export function saveArtifact(db, { content, payload, version }) {
  const artifact = buildArtifact({ content, payload, version });
  db.prepare(`INSERT INTO content_artifacts
    (id,content_id,version,artifact_type,status,html_text,manifest_json,validation_json,created_at)
    VALUES (?,?,?,?,?,?,?,?,?)
    ON CONFLICT(content_id,version) DO UPDATE SET artifact_type=excluded.artifact_type,status=excluded.status,html_text=excluded.html_text,manifest_json=excluded.manifest_json,validation_json=excluded.validation_json,created_at=excluded.created_at`)
    .run(uid('artifact'), content.id, version, content.content_type, artifact.validation.passed ? 'ready' : 'failed', artifact.html, jsonString(artifact.manifest), jsonString(artifact.validation), isoNow());
  return artifact;
}
