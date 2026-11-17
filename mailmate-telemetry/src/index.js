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
<style>body{font:15px system-ui,sans-serif;max-width:820px;margin:40px auto;padding:0 18px;color:#182438}h1{font-size:24px}p{color:#536176}form{display:flex;gap:8px}input{flex:1;padding:10px;border:1px solid #ccd5e3;border-radius:8px}button{padding:10px 16px;border:0;border-radius:8px;background:#2457d6;color:white;cursor:pointer}pre{white-space:pre-wrap;background:#f4f6fa;padding:18px;border-radius:10px;overflow:auto}small{color:#69778b}</style>
<h1>Mailmate 遥测面板</h1><p>输入部署时设置的管理员口令。口令仅保留在本页面内存中。</p>
<form><input type="password" autocomplete="off" placeholder="管理员口令" required><button>查看指标</button></form>
<p id="status" role="status"></p><pre id="report">尚未加载数据。</pre>
<small>本面板展示随机标识安装实例的活跃情况与插件内勾选率，不表示现实中的实际用户人数或任务完成情况。</small>
<script>const form=document.querySelector('form'),statusNode=document.querySelector('#status'),report=document.querySelector('#report');form.addEventListener('submit',async e=>{e.preventDefault();statusNode.textContent='正在读取…';try{const token=form.querySelector('input').value;const r=await fetch('/v1/admin/summary',{method:'POST',headers:{'Authorization':'Bearer '+token}});const d=await r.json();if(!r.ok)throw new Error(d.error||'请求失败');report.textContent=JSON.stringify(d,null,2);statusNode.textContent='更新时间：'+new Date().toLocaleString()}catch(err){statusNode.textContent=err.message}});</script>
</html>`;

async function adminSummary(env) {
  const now = Date.now();
  const active = async (days) => {
    const since = now - days * 86400000;
    const row = await env.DB.prepare("SELECT COUNT(DISTINCT installation_id) AS n FROM telemetry_events WHERE event_type IN ('analysis_started', 'task_snapshot') AND received_at_ms >= ?").bind(since).first();
    return Number(row?.n || 0);
  };
  const [dau, wau, mau, runs, taskTotals, groqErrors, clientErrors, usage] = await Promise.all([
    active(1), active(7), active(30),
    env.DB.prepare("SELECT COUNT(*) AS n FROM telemetry_events WHERE event_type = 'analysis_started' AND received_at_ms >= ?").bind(now - 30 * 86400000).first(),
    env.DB.prepare("SELECT COALESCE(SUM(last_action_total), 0) AS total, COALESCE(SUM(last_action_completed), 0) AS completed FROM installations WHERE last_seen_at_ms >= ?").bind(now - 90 * 86400000).first(),
    env.DB.prepare("SELECT http_status, provider_code, provider_type, provider_message, COUNT(*) AS count FROM telemetry_events WHERE event_type = 'groq_error' AND received_at_ms >= ? GROUP BY http_status, provider_code, provider_type, provider_message ORDER BY count DESC LIMIT 20").bind(now - 7 * 86400000).all(),
    env.DB.prepare("SELECT failure_stage, failure_class, COUNT(*) AS count FROM telemetry_events WHERE event_type = 'client_error' AND received_at_ms >= ? GROUP BY failure_stage, failure_class ORDER BY count DESC LIMIT 20").bind(now - 7 * 86400000).all(),
    env.DB.prepare("SELECT model, COALESCE(SUM(total_tokens), 0) AS total_tokens, COUNT(*) AS requests FROM telemetry_events WHERE event_type = 'groq_success' AND received_at_ms >= ? GROUP BY model ORDER BY requests DESC").bind(now - 30 * 86400000).all()
  ]);
  const total = Number(taskTotals?.total || 0);
  const completed = Number(taskTotals?.completed || 0);
  return {
    generated_at_utc: new Date(now).toISOString(),
    active_installations: { last_24_hours: dau, last_7_days: wau, last_30_days: mau },
    analysis_runs_last_30_days: Number(runs?.n || 0),
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
    if (request.method === "GET" && url.pathname === "/health") return json({ ok: true });
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