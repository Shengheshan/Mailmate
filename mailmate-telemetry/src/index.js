const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400"
};
const EVENT_TYPES = new Set([
  "analysis_started", "analysis_finished", "task_snapshot",
  "groq_success", "groq_error", "client_error"
]);
const MAX_BODY_BYTES = 8192;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

function uuid(value) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function integer(value, max = 1000000) {
  if (!Number.isInteger(value) || value < 0 || value > max) return null;
  return value;
}

function shortCode(value, max = 100) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const result = String(value).trim().replace(/[^a-zA-Z0-9_.:-]/g, "").slice(0, max);
  return result || null;
}

function shortModel(value) {
  if (typeof value !== "string") return null;
  const result = value.trim().replace(/[^a-zA-Z0-9_./:-]/g, "").slice(0, 100);
  return result || null;
}

function validateEvent(event) {
  if (!event || typeof event !== "object" || Array.isArray(event)) return null;
  if (!uuid(event.event_id) || !uuid(event.installation_id) || !EVENT_TYPES.has(event.event_type)) return null;
  const allowedLanguages = new Set(["zh", "en"]);
  const allowedStages = new Set(["http", "network", "timeout", "response_json", "schema_validation", "batch"]);
  return {
    event_id: event.event_id,
    installation_id: event.installation_id,
    event_type: event.event_type,
    app_version: shortCode(event.app_version, 24),
    language: allowedLanguages.has(event.language) ? event.language : null,
    model: shortModel(event.model),
    latency_ms: integer(event.latency_ms, 900000),
    http_status: integer(event.http_status, 599),
    provider_code: shortCode(event.provider_code, 100),
    provider_type: shortCode(event.provider_type, 100),
    provider_message: safeProviderMessage(event.provider_message),
    provider_request_id: shortCode(event.provider_request_id, 160),
    prompt_tokens: integer(event.prompt_tokens, 10000000),
    completion_tokens: integer(event.completion_tokens, 10000000),
    total_tokens: integer(event.total_tokens, 20000000),
    response_chars: integer(event.response_chars, 1000000),
    failure_stage: allowedStages.has(event.failure_stage) ? event.failure_stage : null,
    failure_class: shortCode(event.failure_class, 100),
    scanned_count: integer(event.scanned_count, 100000),
    analyzed_count: integer(event.analyzed_count, 100000),
    cache_hit_count: integer(event.cache_hit_count, 100000),
    skipped_count: integer(event.skipped_count, 100000),
    failed_count: integer(event.failed_count, 100000),
    stopped: typeof event.stopped === "boolean" ? Number(event.stopped) : null,
    action_total: integer(event.action_total, 100000),
    action_completed: integer(event.action_completed, 100000)
  };
}

const ADMIN_HTML = `<!doctype html>
<html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Mailmate 遥测面板</title>
<style>
:root{font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#1c2940;background:#f4f6fb;font-synthesis:none;text-rendering:optimizeLegibility}*{box-sizing:border-box}body{max-width:1160px;margin:0 auto;padding:36px 22px 56px}header{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin-bottom:22px}.eyebrow{margin:0 0 8px;color:#6479bd;font-size:11px;font-weight:800;letter-spacing:.13em}h1{margin:0;color:#192842;font-size:28px;letter-spacing:-.03em}h2{margin:0;color:#25334b;font-size:15px}.subhead,.muted{color:#718098;font-size:13px;line-height:1.55}.subhead{margin:8px 0 0}.access,.panel,.task-panel{border:1px solid #e5e9f2;border-radius:14px;background:#fff;box-shadow:0 8px 28px #1b2b4a08}.access{padding:16px 18px;margin-bottom:20px}.access p{margin:0 0 10px;color:#64728a;font-size:12px}.access form{display:flex;gap:8px;max-width:600px}.access input{min-width:0;flex:1;padding:10px 12px;border:1px solid #d8deea;border-radius:8px;font-size:13px;outline:none}.access input:focus{border-color:#657fe5;box-shadow:0 0 0 3px #657fe520}button{padding:10px 14px;border:0;border-radius:8px;background:#4a63d9;color:white;font-weight:700;font-size:12px;cursor:pointer}button:hover{background:#3f56c5}.quiet-button{border:1px solid #dce2ed;background:#fff;color:#42516c}.quiet-button:hover{background:#f4f6fb}.status{min-height:18px;margin:10px 0 0;color:#738099;font-size:12px}.status.error{color:#b44d43}.toolbar{display:flex;align-items:center;gap:8px}.metric-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.metric{min-height:126px;padding:17px;border:1px solid #e5e9f2;border-radius:14px;background:#fff;box-shadow:0 8px 28px #1b2b4a08}.metric-label{display:block;color:#75829a;font-size:11px;font-weight:650}.metric strong{display:block;margin-top:13px;color:#1f2e49;font-size:30px;letter-spacing:-.04em}.metric small{display:block;margin-top:3px;color:#98a1b1;font-size:10px}.task-panel{margin-top:14px;padding:19px}.task-top{display:flex;justify-content:space-between;align-items:flex-start;gap:20px}.task-rate{color:#4f64d3;font-size:24px;font-weight:800}.task-note{margin:6px 0 15px;color:#8792a5;font-size:11px}.bar{height:9px;overflow:hidden;border-radius:99px;background:#edf0f7}.bar span{display:block;width:0;height:100%;border-radius:inherit;background:linear-gradient(90deg,#7890f1,#4d63d8);transition:width .3s ease}.task-foot{display:flex;justify-content:space-between;gap:12px;margin-top:9px;color:#69778e;font-size:11px}.section-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px}.panel{min-width:0;padding:18px}.panel-header{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:13px}.panel-header small{color:#98a1b1;font-size:10px}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;font-size:11px;text-align:left}th{padding:8px 7px;color:#8b96a7;font-size:9px;font-weight:700;text-transform:none;border-bottom:1px solid #edf0f5}td{max-width:340px;padding:9px 7px;color:#4d5b72;vertical-align:top;border-bottom:1px solid #f0f2f6;overflow-wrap:anywhere}tr:last-child td{border-bottom:0}.count-cell{color:#293b5b;font-weight:800;white-space:nowrap}.empty{padding:18px 7px;color:#99a3b2;text-align:center}.footnote{margin:18px 2px 0;color:#909bad;font-size:10px;line-height:1.6}#dashboard[hidden],.access[hidden]{display:none!important}@media(max-width:780px){body{padding:25px 14px 40px}.metric-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.section-grid{grid-template-columns:1fr}h1{font-size:24px}}@media(max-width:460px){header{flex-direction:column}.metric{min-height:110px;padding:14px}.metric strong{font-size:26px}.access form{flex-direction:column}.access form button{width:100%}.task-foot{flex-direction:column;gap:4px}}
</style>
<body>
<header><div><p class="eyebrow">MAILMATE · TELEMETRY</p><h1>使用数据看板</h1><p class="subhead">查看匿名安装活跃度、分析使用情况、任务勾选率与模型错误。</p></div><div class="toolbar"><button id="refresh" class="quiet-button" type="button" hidden>刷新数据</button><button id="logout" class="quiet-button" type="button" hidden>退出看板</button></div></header>
<section class="access"><p>输入部署时设置的管理员口令。口令只保存在当前页面内存中，不会写入浏览器存储。</p><form><input type="password" autocomplete="off" placeholder="ADMIN_TOKEN 管理员口令" required><button type="submit">查看数据</button></form><div id="status" class="status" role="status"></div></section>
<main id="dashboard" hidden>
 <section class="metric-grid">
  <article class="metric"><span class="metric-label">近 24 小时活跃安装</span><strong id="dau">—</strong><small>按匿名安装标识估算</small></article>
  <article class="metric"><span class="metric-label">近 7 天活跃安装</span><strong id="wau">—</strong><small>按匿名安装标识估算</small></article>
  <article class="metric"><span class="metric-label">近 30 天活跃安装</span><strong id="mau">—</strong><small>按匿名安装标识估算</small></article>
  <article class="metric"><span class="metric-label">近 30 天分析次数</span><strong id="runs">—</strong><small>用户启动的分析批次</small></article>
  <article class="metric"><span class="metric-label">近 30 天扫描邮件数</span><strong id="scanned">—</strong><small>按扫描批次累计，重复扫描会重复计数</small></article>
  <article class="metric"><span class="metric-label">近 30 天新模型分析</span><strong id="analyzed">—</strong><small>不含缓存命中</small></article>
 </section>
 <section class="task-panel"><div class="task-top"><div><h2>任务勾选情况</h2><p class="task-note">按每个活跃安装最近一次任务快照汇总，反映插件内勾选情况。</p></div><strong id="taskRate" class="task-rate">—</strong></div><div class="bar"><span id="taskFill"></span></div><div class="task-foot"><span id="taskCounts">—</span><span>统计窗口：最近 90 天活跃安装</span></div></section>
 <section class="section-grid">
  <article class="panel"><div class="panel-header"><h2>Groq 错误</h2><small>近 7 天 · 最多 20 类</small></div><div id="groqErrors" class="table-wrap"></div></article>
  <article class="panel"><div class="panel-header"><h2>插件错误</h2><small>近 7 天 · 最多 20 类</small></div><div id="clientErrors" class="table-wrap"></div></article>
 </section>
 <section class="panel" style="margin-top:14px"><div class="panel-header"><h2>模型调用</h2><small>近 30 天</small></div><div id="usage" class="table-wrap"></div></section>
 <p id="updated" class="footnote"></p>
</main>
<script>
const form=document.querySelector('form'),input=form.querySelector('input'),access=document.querySelector('.access'),statusNode=document.querySelector('#status'),dashboard=document.querySelector('#dashboard'),refreshButton=document.querySelector('#refresh'),logoutButton=document.querySelector('#logout');
let adminToken='';
const number=value=>new Intl.NumberFormat('zh-CN').format(Number(value)||0);
function renderTable(target,headers,rows){const host=document.querySelector(target),table=document.createElement('table'),thead=document.createElement('thead'),headRow=document.createElement('tr'),tbody=document.createElement('tbody');headers.forEach(label=>{const th=document.createElement('th');th.textContent=label;headRow.append(th)});thead.append(headRow);if(!rows.length){const row=document.createElement('tr'),cell=document.createElement('td');cell.colSpan=headers.length;cell.className='empty';cell.textContent='暂无记录';row.append(cell);tbody.append(row)}else rows.forEach(values=>{const row=document.createElement('tr');values.forEach((value,index)=>{const cell=document.createElement('td');cell.textContent=value==null||value===''?'—':String(value);if(index===values.length-1&&typeof value==='number')cell.className='count-cell';row.append(cell)});tbody.append(row)});table.append(thead,tbody);host.replaceChildren(table)}
function render(data){const active=data.active_installations||{},task=data.latest_task_snapshot_90_day_cohort||{},processing=data.mail_processing_last_30_days||{};document.querySelector('#dau').textContent=number(active.last_24_hours);document.querySelector('#wau').textContent=number(active.last_7_days);document.querySelector('#mau').textContent=number(active.last_30_days);document.querySelector('#runs').textContent=number(data.analysis_runs_last_30_days);document.querySelector('#scanned').textContent=number(processing.scanned_count);document.querySelector('#analyzed').textContent=number(processing.analyzed_count);const rate=task.marked_complete_rate;document.querySelector('#taskRate').textContent=rate==null?'暂无数据':(Math.round(rate*1000)/10)+'%';document.querySelector('#taskFill').style.width=rate==null?'0%':Math.max(0,Math.min(100,rate*100))+'%';document.querySelector('#taskCounts').textContent=number(task.marked_complete)+' / '+number(task.action_items)+' 项已勾选完成';const groq=(data.groq_errors_last_7_days||[]).map(row=>[row.http_status,row.provider_code||row.provider_type||'—',row.provider_message||'—',Number(row.count)||0]);const client=(data.client_errors_last_7_days||[]).map(row=>[row.failure_stage||'—',row.failure_class||'—',Number(row.count)||0]);const usage=(data.groq_usage_last_30_days||[]).map(row=>[row.model||'—',number(row.requests),number(row.total_tokens)]);renderTable('#groqErrors',['HTTP','错误类型','脱敏信息','次数'],groq);renderTable('#clientErrors',['阶段','错误类别','次数'],client);renderTable('#usage',['模型','请求次数','Token 总量'],usage);document.querySelector('#updated').textContent='数据更新时间：'+new Date(data.generated_at_utc||Date.now()).toLocaleString('zh-CN');dashboard.hidden=false;access.hidden=true;refreshButton.hidden=false;logoutButton.hidden=false;statusNode.className='status';statusNode.textContent='数据已更新。'}
async function loadData(){if(!adminToken)return;statusNode.className='status';statusNode.textContent='正在读取…';refreshButton.disabled=true;try{const response=await fetch('/v1/admin/summary',{method:'POST',headers:{'Authorization':'Bearer '+adminToken}});let data={};try{data=await response.json()}catch{}if(!response.ok)throw new Error(response.status===401?'管理员口令不正确，请重新输入。':'读取失败。请确认 D1 数据库迁移已完成后重试。');render(data)}catch(error){statusNode.className='status error';statusNode.textContent=error.message;dashboard.hidden=true;access.hidden=false;refreshButton.hidden=true;logoutButton.hidden=true;adminToken=''}finally{refreshButton.disabled=false}}
form.addEventListener('submit',event=>{event.preventDefault();adminToken=input.value;input.value='';loadData()});refreshButton.addEventListener('click',loadData);logoutButton.addEventListener('click',()=>{adminToken='';input.value='';dashboard.hidden=true;access.hidden=false;refreshButton.hidden=true;logoutButton.hidden=true;statusNode.textContent='管理员口令已清除。'});
</script>
</body>
</html>`;

async function adminSummary(env) {
  const now = Date.now();
  const active = async (days) => {
    const since = now - days * 86400000;
    const row = await env.DB.prepare("SELECT COUNT(DISTINCT installation_id) AS n FROM telemetry_events WHERE event_type IN ('analysis_started', 'task_snapshot') AND received_at_ms >= ?").bind(since).first();
    return Number(row?.n || 0);
  };
  const [dau, wau, mau, runs, taskTotals, groqErrors, clientErrors, usage, processing] = await Promise.all([
    active(1), active(7), active(30),
    env.DB.prepare("SELECT COUNT(*) AS n FROM telemetry_events WHERE event_type = 'analysis_started' AND received_at_ms >= ?").bind(now - 30 * 86400000).first(),
    env.DB.prepare("SELECT COALESCE(SUM(last_action_total), 0) AS total, COALESCE(SUM(last_action_completed), 0) AS completed FROM installations WHERE last_seen_at_ms >= ?").bind(now - 90 * 86400000).first(),
    env.DB.prepare("SELECT http_status, provider_code, provider_type, provider_message, COUNT(*) AS count FROM telemetry_events WHERE event_type = 'groq_error' AND received_at_ms >= ? GROUP BY http_status, provider_code, provider_type, provider_message ORDER BY count DESC LIMIT 20").bind(now - 7 * 86400000).all(),
    env.DB.prepare("SELECT failure_stage, failure_class, COUNT(*) AS count FROM telemetry_events WHERE event_type = 'client_error' AND received_at_ms >= ? GROUP BY failure_stage, failure_class ORDER BY count DESC LIMIT 20").bind(now - 7 * 86400000).all(),
    env.DB.prepare("SELECT model, COALESCE(SUM(total_tokens), 0) AS total_tokens, COUNT(*) AS requests FROM telemetry_events WHERE event_type = 'groq_success' AND received_at_ms >= ? GROUP BY model ORDER BY requests DESC").bind(now - 30 * 86400000).all(),
    env.DB.prepare("SELECT COALESCE(SUM(scanned_count), 0) AS scanned_count, COALESCE(SUM(analyzed_count), 0) AS analyzed_count FROM telemetry_events WHERE event_type = 'analysis_finished' AND received_at_ms >= ?").bind(now - 30 * 86400000).first()
  ]);
  const total = Number(taskTotals?.total || 0);
  const completed = Number(taskTotals?.completed || 0);
  return {
    generated_at_utc: new Date(now).toISOString(),
    active_installations: { last_24_hours: dau, last_7_days: wau, last_30_days: mau },
    analysis_runs_last_30_days: Number(runs?.n || 0),
    mail_processing_last_30_days: {
      scanned_count: Number(processing?.scanned_count || 0),
      analyzed_count: Number(processing?.analyzed_count || 0)
    },
    latest_task_snapshot_90_day_cohort: {
      action_items: total,
      marked_complete: completed,
      marked_complete_rate: total > 0 ? completed / total : null
    },
    groq_errors_last_7_days: groqErrors?.results || [],
    client_errors_last_7_days: clientErrors?.results || [],
    groq_usage_last_30_days: usage?.results || []
  };
}

async function handleEvent(request, env) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) return json({ error: "payload_too_large" }, 413);
  let body;
  try { body = await request.json(); } catch { return json({ error: "invalid_json" }, 400); }
  const encodedSize = new TextEncoder().encode(JSON.stringify(body)).length;
  if (encodedSize > MAX_BODY_BYTES) return json({ error: "payload_too_large" }, 413);
  const event = validateEvent(body);
  if (!event) return json({ error: "invalid_event" }, 400);

  const receivedAt = Date.now();
  const result = await env.DB.prepare(`INSERT OR IGNORE INTO telemetry_events (
    event_id, installation_id, event_type, received_at_ms, app_version, language, model,
    latency_ms, http_status, provider_code, provider_type, provider_message, provider_request_id,
    prompt_tokens, completion_tokens, total_tokens, response_chars, failure_stage, failure_class,
    scanned_count, analyzed_count, cache_hit_count, skipped_count, failed_count, stopped,
    action_total, action_completed
  ) VALUES (${Array(27).fill("?").join(",")})`).bind(
    event.event_id, event.installation_id, event.event_type, receivedAt, event.app_version, event.language, event.model,
    event.latency_ms, event.http_status, event.provider_code, event.provider_type, event.provider_message, event.provider_request_id,
    event.prompt_tokens, event.completion_tokens, event.total_tokens, event.response_chars, event.failure_stage, event.failure_class,
    event.scanned_count, event.analyzed_count, event.cache_hit_count, event.skipped_count, event.failed_count, event.stopped,
    event.action_total, event.action_completed
  ).run();

  if (Number(result?.meta?.changes || 0) > 0) {
    await env.DB.prepare(`INSERT INTO installations (
      installation_id, first_seen_at_ms, last_seen_at_ms, app_version, last_action_total, last_action_completed
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(installation_id) DO UPDATE SET
      last_seen_at_ms = excluded.last_seen_at_ms,
      app_version = COALESCE(excluded.app_version, installations.app_version),
      last_action_total = COALESCE(excluded.last_action_total, installations.last_action_total),
      last_action_completed = COALESCE(excluded.last_action_completed, installations.last_action_completed)`)
      .bind(event.installation_id, receivedAt, receivedAt, event.app_version, event.action_total, event.action_completed).run();
  }
  return json({ ok: true }, 202);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
    if (request.method === "GET" && url.pathname === "/health") {
      try {
        await env.DB.prepare("SELECT 1 FROM telemetry_events LIMIT 1").first();
        return json({ ok: true, storage_ready: true });
      } catch {
        return json({ ok: false, storage_ready: false, error: "storage_unavailable" }, 503);
      }
    }
    if (request.method === "GET" && url.pathname === "/admin") {
      return new Response(ADMIN_HTML, { headers: { ...CORS_HEADERS, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
    }
    if (request.method === "POST" && url.pathname === "/v1/events") {
      try { return await handleEvent(request, env); }
      catch { return json({ error: "storage_unavailable" }, 503); }
    }
    if (request.method === "POST" && url.pathname === "/v1/admin/summary") {
      if (!env.ADMIN_TOKEN || request.headers.get("Authorization") !== `Bearer ${env.ADMIN_TOKEN}`) {
        return json({ error: "unauthorized" }, 401);
      }
      try { return json(await adminSummary(env)); }
      catch { return json({ error: "summary_unavailable" }, 503); }
    }
    return json({ error: "not_found" }, 404);
  },
  async scheduled(_controller, env, ctx) {
    const now = Date.now();
    ctx.waitUntil(env.DB.batch([
      env.DB.prepare("DELETE FROM telemetry_events WHERE received_at_ms < ?").bind(now - 30 * 86400000),
      env.DB.prepare("DELETE FROM installations WHERE last_seen_at_ms < ?").bind(now - 90 * 86400000)
    ]));
  }
};
