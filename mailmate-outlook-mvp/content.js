(() => {
  const HOST_ID = "mailmate-batch-host";
  const CACHE_KEY = "mailmate-analysis-cache-v1";
  const LANGUAGE_KEY = "mailmate-language-v1";
  const MAX_BODY_CHARS = 16000;
  const MAX_CACHE_RECORDS = 500;
  const TOKEN_BUDGET_PER_MINUTE = 7300;
  const MIN_REQUEST_GAP_MS = 2200;
  const ROW_SELECTORS = [
    '[role="main"] [role="listbox"] [role="option"]',
    '[role="main"] [role="grid"] [role="row"]',
    '[role="main"] [role="treegrid"] [role="row"]',
    '[role="listbox"] [role="option"]',
    '[role="grid"] [role="row"]',
    '[role="treegrid"] [role="row"]',
    '[role="main"] [role="option"]',
    '[role="main"] [role="row"]'
  ];
  const BODY_SELECTORS = [
    '[data-testid="message-body"]',
    '[data-testid="messageBody"]',
    '[aria-label="Message body"]',
    '[aria-label="邮件正文"]',
    '[data-testid*="message-body" i]',
    '[data-testid*="messageBody" i]',
    '[id*="messageBody" i]',
    '[class*="message-body" i]',
    '[role="document"]'
  ];

  if (document.getElementById(HOST_ID)) return;

  const strings = {
    zh: {
      brand: "Mailmate 邮件助手",
      open: "Mailmate",
      language: "显示语言",
      chinese: "简体中文",
      english: "English",
      intro: "选择语言并输入 Groq API Key。点一次开始后，扩展会自动读取当前文件夹近两周的邮件；请保持 Outlook 按最新邮件优先排序。",
      key: "Groq API Key（只在本次标签页内存中使用）",
      consent: "我同意将近两周邮件的正文发送到 Groq（美国）进行分析。",
      unread: "我已在 Outlook 设置中选择“不要自动标记为已读”，并确认过设置有效。",
      links: "同时把正文中的链接地址发送给模型（默认关闭；链接可能含个人专属信息）",
      cache: "将结构化结果和完成状态保存在本浏览器，用于下次跳过已分析邮件（不保存邮件正文或 API Key）",
      start: "开始分析近两周邮件",
      stop: "停止",
      clear: "清除本地缓存",
      needKey: "请输入有效的 Groq API Key。",
      needConsent: "请先同意将邮件正文发送给 Groq。",
      needUnread: "请先确认 Outlook 已关闭自动标记已读。",
      noList: "没有识别到当前邮件列表。请打开 Outlook 收件箱或其他邮件文件夹后再试。",
      scanning: "正在检查邮件列表…",
      opening: (subject) => "正在打开邮件：" + subject,
      analyzing: (n, subject) => "正在分析第 " + n + " 封：" + subject,
      waiting: "正在按 Groq 速率限制等待…",
      noBody: "未能读取这封邮件的正文，已跳过。",
      unknownDate: "无法判断邮件列表日期，已跳过该邮件。",
      tooManyUnknown: "连续多封邮件无法识别日期，已停止，避免读取范围外邮件。",
      quota: "Groq 额度或速率限制已到；已保留本地缓存。稍后重新开始会跳过已分析邮件。",
      payloadRetry: (n) => "请求超出大小限制，正在保留邮件开头和结尾并缩短至约 " + n + " 字符后重试…",
      payloadTooLarge: "Groq 仍返回 413，请求体过大。这封邮件未完成分析；请减少随邮件发送的链接，或使用服务端分段处理。",
      bodyTrimmed: "请求大小超限：发送给模型的正文省略了中间部分，仅保留开头和结尾。请打开原邮件核对摘要。",
      stopped: "已按要求停止。",
      finished: (scanned, reused, analyzed, skipped, failed) =>
        "完成：范围内 " + scanned + " 封，缓存复用 " + reused + " 封，新分析 " + analyzed +
        " 封，跳过 " + skipped + " 封，失败 " + failed + " 封。",
      progress: (n, total, subject) => "已处理 " + n + " 封" + (total ? "；当前已发现 " + total + " 封" : "") + "：" + subject,
      resultCount: (n) => "汇总卡片：" + n + " 封",
      summary: "邮件内容摘要",
      action: "需要行动",
      deadline: "截止日期（标准化）",
      rawDeadline: "截止日期（邮件原文）",
      event: "相关事件",
      category: "分类",
      importance: "重要性",
      reply: "需要回复",
      noAction: "无需行动",
      complete: "我已完成这项行动",
      source: "查看邮件原文",
      eventSource: "原文时间表达",
      linksFound: (n) => "正文中找到 " + n + " 个可见链接；地址默认不会发送。",
      cacheCleared: "本地分析缓存已清除。",
      cacheError: "无法访问本地缓存；本次仍可继续分析，但不会复用或保存结果。",
      noRows: "当前文件夹没有可读取的邮件。",
      retrying: (s) => "Groq 暂时限流，" + s + " 秒后重试…",
      errPrefix: "分析遇到问题：",
      authError: "Groq 拒绝了请求。请检查 API Key、模型权限和账户设置。",
      unreadNote: "扩展会在 Outlook 页面中逐封打开邮件。它不会主动改变已读状态，但 Outlook 的“自动标记为已读”设置必须关闭。"
    },
    en: {
      brand: "Mailmate Email Assistant",
      open: "Mailmate",
      language: "Display language",
      chinese: "简体中文",
      english: "English",
      intro: "Choose a language and enter your Groq API key. Click start once to scan the current folder's last two weeks; keep Outlook sorted newest first.",
      key: "Groq API key (kept only in this tab's memory)",
      consent: "I agree to send the email bodies in this range to Groq (US) for analysis.",
      unread: "I set Outlook to “Don't automatically mark as read” and verified the setting.",
      links: "Also send visible link addresses to the model (off by default; links can be personal)",
      cache: "Save structured results and completion flags in this browser to skip analyzed emails next time (no email body or API key is saved)",
      start: "Analyze emails from the last two weeks",
      stop: "Stop",
      clear: "Clear local cache",
      needKey: "Enter a valid Groq API key.",
      needConsent: "Consent to send email bodies to Groq first.",
      needUnread: "Confirm that Outlook automatic marking as read is disabled.",
      noList: "No email list was found. Open an Outlook folder and try again.",
      scanning: "Checking the email list…",
      opening: (subject) => "Opening email: " + subject,
      analyzing: (n, subject) => "Analyzing email " + n + ": " + subject,
      waiting: "Waiting for Groq rate limits…",
      noBody: "Could not read this email body; skipped.",
      unknownDate: "Could not determine this email's list date; skipped.",
      tooManyUnknown: "Several email dates could not be read; stopped to avoid scanning outside the selected range.",
      quota: "Groq quota or rate limit reached. Local cache is saved; restarting later will skip analyzed emails.",
      payloadRetry: (n) => "Request too large. Retrying with the beginning and end of the email, about " + n + " characters…",
      payloadTooLarge: "Groq still returned 413 after shortening the message. This email was not analyzed; reduce included links or use server-side chunking.",
      bodyTrimmed: "Request size limit: the model received the beginning and end of this email; the middle was omitted. Check the original email before relying on the summary.",
      stopped: "Stopped as requested.",
      finished: (scanned, reused, analyzed, skipped, failed) =>
        "Done: " + scanned + " in range, " + reused + " reused, " + analyzed +
        " newly analyzed, " + skipped + " skipped, " + failed + " failed.",
      progress: (n, total, subject) => "Processed " + n + (total ? " (found " + total + ")" : "") + ": " + subject,
      resultCount: (n) => "Summary cards: " + n,
      summary: "Email summary",
      action: "Action needed",
      deadline: "Normalized deadline",
      rawDeadline: "Deadline source text",
      event: "Related event",
      category: "Category",
      importance: "Importance",
      reply: "Reply needed",
      noAction: "No action needed",
      complete: "I completed this action",
      source: "View email text",
      eventSource: "Source wording",
      linksFound: (n) => "Found " + n + " visible link(s); addresses are not sent by default.",
      cacheCleared: "Local analysis cache cleared.",
      cacheError: "Local cache is unavailable; this run can continue without reuse or saving.",
      noRows: "No readable emails were found in this folder.",
      retrying: (s) => "Groq is temporarily rate-limiting requests; retrying in " + s + " seconds…",
      errPrefix: "Analysis error: ",
      authError: "Groq rejected the request. Check the API key, model access, and account settings.",
      unreadNote: "The extension opens each email in Outlook's page. It does not change read state itself, but Outlook's automatic mark-as-read setting must be disabled."
    }
  };

  const styles = [
    ":host{all:initial}",
    "*{box-sizing:border-box}",
    ".launcher{position:fixed;z-index:2147483647;right:22px;bottom:22px;border:0;border-radius:999px;padding:13px 18px;color:#fff;background:#2457d6;box-shadow:0 6px 24px #10255042;font:600 14px/1.2 system-ui,sans-serif;cursor:pointer}",
    ".launcher:hover{background:#1747bf}",
    ".panel{position:fixed;z-index:2147483647;right:22px;bottom:78px;width:min(470px,calc(100vw - 28px));max-height:min(82vh,850px);overflow:auto;border:1px solid #dce3ee;border-radius:16px;color:#182438;background:#f7f9fc;box-shadow:0 18px 54px #10255035;font:14px/1.45 system-ui,sans-serif}",
    ".panel[hidden]{display:none}",
    "header{display:flex;align-items:center;justify-content:space-between;padding:15px 17px 12px;background:#fff;border-bottom:1px solid #e5eaf2;position:sticky;top:0}",
    "h1{margin:0;font-size:17px;line-height:1.2}",
    ".close{border:0;background:transparent;color:#5d687a;font:22px/1 system-ui;cursor:pointer;padding:3px 6px}",
    ".content{padding:12px 16px 16px}",
    ".hint{color:#536176;font-size:12px;margin:0 0 10px}",
    "label{display:block;margin:9px 0 5px;font-size:12px;font-weight:650;color:#334259}",
    "input[type=password],select{width:100%;padding:9px 10px;border:1px solid #ccd5e3;border-radius:8px;background:#fff;color:#17243a;font:13px system-ui,sans-serif}",
    ".check{display:flex;gap:8px;align-items:flex-start;margin:10px 0;font-size:12px;font-weight:400;color:#37465c}",
    ".check input{margin:3px 0 0;flex:0 0 auto}",
    ".buttons{display:flex;gap:8px;margin-top:12px}",
    "button.primary,button.secondary{border:0;border-radius:8px;padding:9px 11px;font:650 12px system-ui,sans-serif;cursor:pointer}",
    "button.primary{flex:1;color:#fff;background:#2457d6}",
    "button.secondary{color:#173b76;background:#e3ebf8}",
    "button:disabled{opacity:.55;cursor:wait}",
    ".status{min-height:18px;margin:9px 0 0;color:#536176;font-size:12px}",
    ".status.error{color:#a32828}.status.ok{color:#116149}",
    ".stats{margin:8px 0 0;color:#536176;font-size:12px}",
    ".results{display:grid;gap:9px;margin-top:11px}",
    ".card{padding:11px;border:1px solid #dce3ee;border-radius:10px;background:#fff}",
    ".card-warning{padding:7px 9px;margin-top:7px;border-radius:7px;background:#fff4d9;color:#795500;font-size:11px;overflow-wrap:anywhere}",
    ".title{font-size:13px;font-weight:700;overflow-wrap:anywhere}",
    ".meta{margin-top:3px;color:#64738a;font-size:11px;overflow-wrap:anywhere}",
    ".badge{display:inline-block;margin:6px 5px 0 0;padding:3px 8px;border-radius:999px;background:#e8eef9;font-size:11px}",
    ".badge.high{background:#fde8e7;color:#9c2626}.badge.medium{background:#fff2d5;color:#805400}.badge.low{background:#e8f4ee;color:#1e6847}",
    ".field{padding:8px 9px;margin-top:6px;border-radius:7px;background:#f7f9fc;font-size:12px;overflow-wrap:anywhere;white-space:pre-wrap}",
    ".field b{display:block;margin-bottom:2px;color:#66748a;font-size:10px}",
    ".completion{display:flex;gap:7px;align-items:flex-start;margin:8px 0 0;font-size:12px;font-weight:500}",
    ".completion input{margin:3px 0 0;flex:0 0 auto}",
    "details{margin-top:8px;border-top:1px solid #e3e8f0;padding-top:7px}",
    "summary{cursor:pointer;color:#36517f;font-size:11px;font-weight:600}",
    "pre{max-height:170px;overflow:auto;margin:7px 0 0;padding:8px;border-radius:6px;background:#f7f9fc;white-space:pre-wrap;overflow-wrap:anywhere;font:11px/1.45 system-ui,sans-serif}",
    ".foot{margin:8px 0 0;color:#6b7788;font-size:10px}"
  ].join("\n");

  const host = document.createElement("div");
  host.id = HOST_ID;
  const shadow = host.attachShadow({ mode: "closed" });
  document.documentElement.append(host);
  const style = document.createElement("style");
  style.textContent = styles;
  const root = document.createElement("div");
  root.innerHTML = [
    '<button class="launcher" type="button"></button>',
    '<section class="panel" hidden>',
    ' <header><h1></h1><button class="close" type="button" aria-label="Close">×</button></header>',
    ' <div class="content">',
    '  <label class="language-label"></label><select class="language"><option value="zh"></option><option value="en"></option></select>',
    '  <p class="hint intro"></p>',
    '  <label class="key-label"></label><input class="api-key" type="password" autocomplete="off" spellcheck="false">',
    '  <label class="check"><input class="consent" type="checkbox"><span class="consent-text"></span></label>',
    '  <label class="check"><input class="unread-confirm" type="checkbox"><span class="unread-text"></span></label>',
    '  <label class="check"><input class="send-links" type="checkbox"><span class="links-text"></span></label>',
    '  <label class="check"><input class="cache-enabled" type="checkbox" checked><span class="cache-text"></span></label>',
    '  <div class="buttons"><button class="primary start" type="button"></button><button class="secondary stop" type="button" disabled></button><button class="secondary clear" type="button"></button></div>',
    '  <p class="status" aria-live="polite"></p><p class="stats"></p><div class="results"></div>',
    '  <p class="foot unread-note"></p>',
    ' </div>',
    '</section>'
  ].join("");
  shadow.append(style, root);

  const $ = (selector) => root.querySelector(selector);
  const launcher = $(".launcher");
  const panel = $(".panel");
  const languageSelect = $(".language");
  const keyInput = $(".api-key");
  const consentInput = $(".consent");
  const unreadInput = $(".unread-confirm");
  const linksInput = $(".send-links");
  const cacheInput = $(".cache-enabled");
  const startButton = $(".start");
  const stopButton = $(".stop");
  const clearButton = $(".clear");
  const statusNode = $(".status");
  const statsNode = $(".stats");
  const resultsNode = $(".results");
  let language = (navigator.language || "en").toLowerCase().startsWith("zh") ? "zh" : "en";
  let running = false;
  let stopRequested = false;
  let persistentCache = {};
  let currentRecords = new Map();
  let lastRequestAt = 0;
  let tokenWindow = [];

  function makeText(tag, className, value) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = value == null ? "" : String(value);
    return element;
  }

  function setLanguage(next) {
    language = next === "zh" ? "zh" : "en";
    const t = strings[language];
    $("header h1").textContent = t.brand;
    launcher.textContent = t.open;
    $(".language-label").textContent = t.language;
    languageSelect.options[0].textContent = t.chinese;
    languageSelect.options[1].textContent = t.english;
    languageSelect.value = language;
    $(".intro").textContent = t.intro;
    $(".key-label").textContent = t.key;
    $(".consent-text").textContent = t.consent;
    $(".unread-text").textContent = t.unread;
    $(".links-text").textContent = t.links;
    $(".cache-text").textContent = t.cache;
    startButton.textContent = t.start;
    stopButton.textContent = t.stop;
    clearButton.textContent = t.clear;
    $(".unread-note").textContent = t.unreadNote;
    if (currentRecords.size) renderRecords();
  }

  function setStatus(message, kind) {
    statusNode.textContent = message || "";
    statusNode.className = "status" + (kind ? " " + kind : "");
  }

  function clean(value) {
    return String(value || "").replace(/\u00a0/g, " ").split("\n")
      .map((line) => line.replace(/[\t ]+/g, " ").trim())
      .filter(Boolean).join("\n").trim();
  }

  function visible(element) {
    if (!element || !element.getClientRects().length) return false;
    const style = getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
  }

  function makeLocalDate(year, month, day) {
    const result = new Date(year, month - 1, day, 0, 0, 0, 0);
    if (result.getFullYear() !== year || result.getMonth() !== month - 1 || result.getDate() !== day) return null;
    return result;
  }

  function addLocalDays(date, days) {
    const result = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
    result.setDate(result.getDate() + days);
    return result;
  }

  function parseDateText(rawValue, referenceValue) {
    const raw = clean(rawValue);
    if (!raw) return null;
    const refCandidate = referenceValue instanceof Date ? referenceValue : new Date(referenceValue || Date.now());
    const reference = Number.isNaN(refCandidate.getTime()) ? new Date() : refCandidate;
    const base = makeLocalDate(reference.getFullYear(), reference.getMonth() + 1, reference.getDate());
    const lower = raw.toLowerCase();

    const isoTime = raw.match(/\b(20\d{2}-\d{2}-\d{2}t[^ \n,;]*)/i);
    if (isoTime) {
      const isoDate = new Date(isoTime[1]);
      if (!Number.isNaN(isoDate.getTime())) return isoDate;
    }
    const isoDate = raw.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
    if (isoDate) return makeLocalDate(Number(isoDate[1]), Number(isoDate[2]), Number(isoDate[3]));

    const chineseFull = raw.match(/(20\d{2})年\s*(\d{1,2})月\s*(\d{1,2})日?/);
    if (chineseFull) return makeLocalDate(Number(chineseFull[1]), Number(chineseFull[2]), Number(chineseFull[3]));
    const chineseShort = raw.match(/(\d{1,2})月\s*(\d{1,2})日/);
    if (chineseShort) {
      let year = reference.getFullYear();
      let parsed = makeLocalDate(year, Number(chineseShort[1]), Number(chineseShort[2]));
      if (parsed && parsed < base && base.getMonth() - parsed.getMonth() > 5) parsed = makeLocalDate(year + 1, Number(chineseShort[1]), Number(chineseShort[2]));
      return parsed;
    }

    const slash = raw.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/);
    if (slash) {
      let first = Number(slash[1]);
      let second = Number(slash[2]);
      let year = Number(slash[3]);
      if (year < 100) year += 2000;
      const usOrder = (navigator.language || "").toLowerCase().startsWith("en-us");
      const month = usOrder ? first : second;
      const day = usOrder ? second : first;
      if (first > 12) return makeLocalDate(year, second, first);
      return makeLocalDate(year, month, day);
    }

    const monthNames = "january|february|march|april|may|june|july|august|september|october|november|december";
    const monthMap = {
      january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
      july: 7, august: 8, september: 9, october: 10, november: 11, december: 12
    };
    const monthFirst = raw.match(new RegExp("\\b(" + monthNames + ")\\s+(\\d{1,2})(?:,?\\s+(\\d{4}))?\\b", "i"));
    const dayFirst = raw.match(new RegExp("\\b(\\d{1,2})\\s+(" + monthNames + ")(?:\\s+(\\d{4}))?\\b", "i"));
    let month = null;
    let day = null;
    let year = reference.getFullYear();
    if (monthFirst) {
      month = monthMap[monthFirst[1].toLowerCase()];
      day = Number(monthFirst[2]);
      year = monthFirst[3] ? Number(monthFirst[3]) : year;
    } else if (dayFirst) {
      day = Number(dayFirst[1]);
      month = monthMap[dayFirst[2].toLowerCase()];
      year = dayFirst[3] ? Number(dayFirst[3]) : year;
    }
    if (month && day) {
      let parsed = makeLocalDate(year, month, day);
      if (parsed && !monthFirst?.[3] && !dayFirst?.[3] && parsed < base && base.getMonth() - parsed.getMonth() > 5) {
        parsed = makeLocalDate(year + 1, month, day);
      }
      return parsed;
    }

    if (/\b(today|tonight)\b|今天|今日/i.test(raw)) return base;
    if (/\b(yesterday)\b|昨天|昨日/i.test(raw)) return addLocalDays(base, -1);
    if (/\b(tomorrow)\b|明天|明日/i.test(raw)) return addLocalDays(base, 1);
    const daysAgo = lower.match(/\b(\d+)\s+days?\s+ago\b/);
    const daysIn = lower.match(/\b(?:in|within)\s+(\d+)\s+days?\b/);
    const chineseDays = raw.match(/(\d+)\s*天(前|后)/);
    if (daysAgo) return addLocalDays(base, -Number(daysAgo[1]));
    if (daysIn) return addLocalDays(base, Number(daysIn[1]));
    if (chineseDays) return addLocalDays(base, Number(chineseDays[1]) * (chineseDays[2] === "前" ? -1 : 1));

    const weekdays = {
      sunday: 0, sun: 0, monday: 1, mon: 1, tuesday: 2, tue: 2, tues: 2,
      wednesday: 3, wed: 3, thursday: 4, thu: 4, thur: 4, thurs: 4,
      friday: 5, fri: 5, saturday: 6, sat: 6
    };
    const weekdayMatch = lower.match(/\b(sunday|sun|monday|mon|tuesday|tue|tues|wednesday|wed|thursday|thu|thur|thurs|friday|fri|saturday|sat)\b/);
    const chineseWeekday = raw.match(/(?:星期|周)([一二三四五六日天])/);
    let target = weekdayMatch ? weekdays[weekdayMatch[1]] : null;
    if (target === null && chineseWeekday) target = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 0, 天: 0 }[chineseWeekday[1]];
    if (target !== null && target !== undefined) {
      let diff = (target - base.getDay() + 7) % 7;
      if (/\bnext\b|下周|下星期/i.test(raw)) diff = diff === 0 ? 7 : diff + 7;
      return addLocalDays(base, diff);
    }

    if (/^\s*\d{1,2}:\d{2}\s*(am|pm)?\s*$/i.test(raw)) return base;
    if (/\b\d+\s*(hour|hours|hr|hrs)\s+ago\b/i.test(raw)) return base;

    if (/\d/.test(raw) && monthNames.split("|").some((name) => lower.includes(name))) {
      const parsedNative = new Date(raw);
      if (!Number.isNaN(parsedNative.getTime())) return makeLocalDate(parsedNative.getFullYear(), parsedNative.getMonth() + 1, parsedNative.getDate());
    }
    return null;
  }

  function formatLocalDate(date) {
    const y = String(date.getFullYear()).padStart(4, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + d;
  }

  function normalizeDeadline(deadline, referenceDate) {
    if (!deadline || typeof deadline.raw_text !== "string") return null;
    const parsed = parseDateText(deadline.raw_text, referenceDate);
    if (!parsed) return { raw_text: deadline.raw_text, normalized: null, precision: null };
    const time = deadline.raw_text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
    if (time) {
      let hour = Number(time[1]) % 12;
      if (time[3].toLowerCase() === "pm") hour += 12;
      const minute = Number(time[2] || 0);
      const value = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), hour, minute, 0, 0);
      return {
        raw_text: deadline.raw_text,
        normalized: formatLocalDate(value) + "T" + String(hour).padStart(2, "0") + ":" + String(minute).padStart(2, "0") + ":00",
        precision: "datetime"
      };
    }
    const time24 = deadline.raw_text.match(/\b(?:at|@)\s*(\d{1,2}):(\d{2})\b/i);
    if (time24) {
      const hour = Number(time24[1]);
      const minute = Number(time24[2]);
      return {
        raw_text: deadline.raw_text,
        normalized: formatLocalDate(parsed) + "T" + String(hour).padStart(2, "0") + ":" + String(minute).padStart(2, "0") + ":00",
        precision: "datetime"
      };
    }
    return { raw_text: deadline.raw_text, normalized: formatLocalDate(parsed), precision: "date" };
  }

  function normalizedText(value) {
    return clean(value).replace(/\n/g, " ").replace(/\s+/g, " ").trim();
  }

  function extractCurrentEmail() {
    const main = document.querySelector('[role="main"]') || document;
    const candidates = [];
    const seen = new Set();
    BODY_SELECTORS.forEach((selector, order) => {
      for (const element of main.querySelectorAll(selector)) {
        if (seen.has(element)) continue;
        seen.add(element);
        if (!visible(element) || element.isContentEditable || element.closest('[contenteditable="true"]')) continue;
        const body = clean(element.innerText || "");
        if (body.length < 25 || body.length > 100000) continue;
        if (element.querySelectorAll('[role="row"],[role="option"],[role="listitem"]').length > 2) continue;
        candidates.push({ element, body, order });
      }
    });
    candidates.sort((a, b) => a.order - b.order || a.body.length - b.body.length);
    const selected = candidates[0];
    if (!selected) return null;

    const subjectNode = main.querySelector('[data-testid*="subject" i],[aria-label*="Subject" i],[aria-label*="主题"],[role="heading"][aria-level="2"]') || main.querySelector("h1,h2");
    const senderNode = main.querySelector('[data-testid*="sender" i],[aria-label*="From" i],[aria-label*="发件人"],[email],button[title*="@"]');
    const timeNode = main.querySelector('time[datetime],[data-testid*="received" i],[aria-label*="Received" i],[aria-label*="接收时间"]');
    const links = [...selected.element.querySelectorAll("a[href]")]
      .filter(visible)
      .map((anchor) => {
        let url;
        try { url = new URL(anchor.href); } catch { return null; }
        if (!["https:", "http:", "mailto:"].includes(url.protocol)) return null;
        return {
          label: normalizedText(anchor.innerText || anchor.getAttribute("aria-label") || "(link)").slice(0, 180),
          url: url.href.slice(0, 2048)
        };
      })
      .filter(Boolean)
      .slice(0, 20);
    const subject = normalizedText(subjectNode?.innerText || subjectNode?.getAttribute("aria-label") || "");
    const sender = normalizedText(senderNode?.innerText || senderNode?.getAttribute("title") || senderNode?.getAttribute("aria-label") || senderNode?.getAttribute("email") || "");
    const receivedAt = clean(timeNode?.getAttribute("datetime") || timeNode?.getAttribute("title") || timeNode?.innerText || "");
    return {
      subject: subject || "(subject not identified)",
      sender: sender || "(sender not identified)",
      received_at: receivedAt || null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
      body_text: selected.body.slice(0, MAX_BODY_CHARS),
      links,
      links_total: links.length,
      source_selector: BODY_SELECTORS[selected.order]
    };
  }

  function visibleRows(selector) {
    if (!selector) return [];
    return [...document.querySelectorAll(selector)].filter((row) => {
      if (!visible(row) || row.querySelector('[role="columnheader"]')) return false;
      const content = normalizedText(row.innerText || row.getAttribute("aria-label") || "");
      return content.length >= 12;
    });
  }

  function chooseRowSelector() {
    let best = null;
    let bestCount = 0;
    for (const selector of ROW_SELECTORS) {
      const count = visibleRows(selector).length;
      if (count > bestCount) {
        best = selector;
        bestCount = count;
      }
      if (count >= 8) return selector;
    }
    return bestCount ? best : null;
  }

  function rowIdentifier(row) {
    for (const name of ["data-itemid", "data-item-id", "data-message-id", "data-messageid", "data-conversation-id", "data-id"]) {
      const value = row.getAttribute(name);
      if (value) return name + ":" + value;
    }
    const nested = row.querySelector("[data-itemid],[data-item-id],[data-message-id],[data-messageid],[data-conversation-id],[data-id]");
    if (nested) {
      for (const name of ["data-itemid", "data-item-id", "data-message-id", "data-messageid", "data-conversation-id", "data-id"]) {
        const value = nested.getAttribute(name);
        if (value) return name + ":" + value;
      }
    }
    const link = row.querySelector("a[href]");
    if (link?.href) return "href:" + link.href;
    return "text:" + normalizedText(row.innerText || row.getAttribute("aria-label") || "").slice(0, 1800);
  }

  function extractRowDate(row, rowText) {
    const candidates = [];
    for (const element of row.querySelectorAll('time[datetime],time,[data-testid*="date" i],[aria-label*="received" i],[aria-label*="sent" i],[title]')) {
      if (!visible(element)) continue;
      candidates.push(element.getAttribute("datetime"), element.getAttribute("title"), element.getAttribute("aria-label"), element.innerText);
    }
    candidates.push(row.getAttribute("aria-label"));
    const lines = clean(rowText).split("\n").reverse();
    candidates.push(...lines);
    for (const value of candidates) {
      if (!value) continue;
      const parsed = parseDateText(value, new Date());
      if (parsed) return { raw: clean(value), date: parsed };
    }
    return { raw: "", date: null };
  }

  function describeRow(row) {
    const rowText = clean(row.innerText || row.getAttribute("aria-label") || "");
    const subjectNode = row.querySelector('[data-testid*="subject" i],[aria-label*="subject" i],[class*="subject" i]');
    const subject = normalizedText(subjectNode?.innerText || subjectNode?.getAttribute("title") || "") || rowText.split("\n").filter(Boolean)[1] || rowText.slice(0, 100);
    const dateInfo = extractRowDate(row, rowText);
    return {
      element: row,
      key: rowIdentifier(row),
      stableId: rowIdentifier(row).slice(0, 500),
      text: rowText,
      subject: subject.slice(0, 300),
      receivedRaw: dateInfo.raw,
      receivedDate: dateInfo.date
    };
  }

  function isSelectedRow(row) {
    if (!row) return false;
    if (row.getAttribute("aria-selected") === "true" || row.getAttribute("aria-checked") === "true" || row.getAttribute("data-is-selected") === "true") return true;
    return /\b(selected|is-selected|mailListItemSelected)\b/i.test(String(row.className || ""));
  }

  function findRow(selector, key) {
    return visibleRows(selector).find((row) => rowIdentifier(row) === key) || null;
  }

  function emailIdentity(email) {
    return [email.subject, email.sender, email.body_text].join("\u0000");
  }

  function findScrollContainer(row) {
    let node = row;
    while (node && node !== document.body && node !== document.documentElement) {
      const style = getComputedStyle(node);
      if (node.scrollHeight > node.clientHeight + 12 && /(auto|scroll|overlay)/.test(style.overflowY)) return node;
      node = node.parentElement;
    }
    return document.scrollingElement || document.documentElement;
  }

  function scrollPosition(scroller) {
    return scroller === document.scrollingElement || scroller === document.documentElement ? window.scrollY : scroller.scrollTop;
  }

  function scrollViewport(scroller) {
    return scroller === document.scrollingElement || scroller === document.documentElement ? window.innerHeight : scroller.clientHeight;
  }

  function scrollHeight(scroller) {
    return scroller === document.scrollingElement || scroller === document.documentElement ? document.documentElement.scrollHeight : scroller.scrollHeight;
  }

  function scrollToPosition(scroller, position) {
    if (scroller === document.scrollingElement || scroller === document.documentElement) window.scrollTo(0, position);
    else scroller.scrollTop = position;
  }

  function scrollDown(scroller) {
    const before = scrollPosition(scroller);
    const step = Math.max(220, Math.floor(scrollViewport(scroller) * 0.72));
    scrollToPosition(scroller, before + step);
    return before;
  }

  function atScrollEnd(scroller) {
    return scrollPosition(scroller) + scrollViewport(scroller) >= scrollHeight(scroller) - 8;
  }

  async function readOpenedRow(descriptor, selector) {
    const row = findRow(selector, descriptor.key);
    if (!row) return null;
    const before = extractCurrentEmail();
    const beforeIdentity = before ? emailIdentity(before) : "";
    if (isSelectedRow(row) && before) {
      before.message_id = descriptor.stableId;
      return before;
    }
    row.scrollIntoView({ block: "center", inline: "nearest" });
    row.click();
    let lastIdentity = "";
    let stableCount = 0;
    for (let attempt = 0; attempt < 48; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      const current = extractCurrentEmail();
      if (!current) continue;
      const identity = emailIdentity(current);
      stableCount = identity === lastIdentity ? stableCount + 1 : 0;
      lastIdentity = identity;
      const currentRow = findRow(selector, descriptor.key);
      const subjectMatches = descriptor.subject && current.subject &&
        (current.subject.toLowerCase().includes(descriptor.subject.toLowerCase()) ||
         descriptor.subject.toLowerCase().includes(current.subject.toLowerCase()));
      if (stableCount >= 2 && (identity !== beforeIdentity || subjectMatches || !before)) {
        current.message_id = descriptor.stableId;
        return current;
      }
    }
    return null;
  }

  function estimateTokens(email) {
    return Math.ceil(email.body_text.length / 3.8) + 900;
  }

  function clipBodyForRetry(value, maxChars) {
    const chars = Array.from(String(value || ""));
    if (chars.length <= maxChars) return chars.join("");
    const marker = language === "zh" ? "\n……中间内容因请求大小限制省略……\n" : "\n…middle omitted due to request size limit…\n";
    const remaining = Math.max(0, maxChars - Array.from(marker).length);
    const headLength = Math.ceil(remaining * 0.65);
    const tailLength = remaining - headLength;
    return chars.slice(0, headLength).join("") + marker + (tailLength ? chars.slice(-tailLength).join("") : "");
  }

  async function waitForProviderCapacity(estimate) {
    while (!stopRequested) {
      const now = Date.now();
      tokenWindow = tokenWindow.filter((item) => now - item.at < 60000);
      const used = tokenWindow.reduce((sum, item) => sum + item.tokens, 0);
      const rpmWait = Math.max(0, MIN_REQUEST_GAP_MS - (now - lastRequestAt));
      const tpmWait = used + estimate > TOKEN_BUDGET_PER_MINUTE && tokenWindow.length
        ? Math.max(0, tokenWindow[0].at + 60000 - now + 100)
        : 0;
      const wait = Math.max(rpmWait, tpmWait);
      if (wait <= 0) return;
      setStatus(strings[language].waiting);
      await new Promise((resolve) => setTimeout(resolve, Math.min(wait, 1000)));
    }
  }

  async function digestText(value) {
    const bytes = new TextEncoder().encode(value);
    if (crypto?.subtle?.digest) {
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    }
    let hash = 2166136261;
    for (const char of value) {
      hash ^= char.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16);
  }

  async function loadCache() {
    try {
      const result = await chrome.storage.local.get(CACHE_KEY);
      persistentCache = result[CACHE_KEY] && typeof result[CACHE_KEY] === "object" ? result[CACHE_KEY] : {};
      return true;
    } catch {
      persistentCache = {};
      setStatus(strings[language].cacheError, "error");
      return false;
    }
  }

  function storedRecord(record) {
    return {
      cache_key: record.cache_key,
      message_id: record.message_id,
      subject: record.subject,
      sender: record.sender,
      received_at: record.received_at,
      received_epoch: record.received_epoch,
      analysis: record.analysis,
      normalized_deadline: record.normalized_deadline,
      completed: Boolean(record.completed),
      truncated_for_provider: Boolean(record.truncated_for_provider),
      usage: record.usage || null
    };
  }

  async function saveRecord(record) {
    if (!cacheInput.checked) return;
    persistentCache[record.cache_key] = storedRecord(record);
    const entries = Object.entries(persistentCache).sort((a, b) => (b[1].received_epoch || 0) - (a[1].received_epoch || 0)).slice(0, MAX_CACHE_RECORDS);
    persistentCache = Object.fromEntries(entries);
    try { await chrome.storage.local.set({ [CACHE_KEY]: persistentCache }); }
    catch { setStatus(strings[language].cacheError, "error"); }
  }

  async function cacheKeyForRow(descriptor, receivedDate) {
    // Outlook list rows expose a stable item/conversation ID plus a visible
    // received-date label. This lets a later run reuse the result before
    // opening the message or touching its read state.
    return digestText([
      descriptor.stableId || descriptor.key,
      descriptor.subject || "",
      receivedDate ? formatLocalDate(receivedDate) :
        (descriptor.receivedDate ? formatLocalDate(descriptor.receivedDate) : descriptor.receivedRaw || "")
    ].join("\u0000"));
  }

  function reuseCachedRecord(cacheKey) {
    const stored = persistentCache[cacheKey];
    if (!stored) return false;
    const cached = { ...stored, cache_key: cacheKey, body_text: "" };
    currentRecords.set(cacheKey, cached);
    renderRecords();
    return true;
  }

  function renderRecords() {
    const importanceRank = { high: 0, medium: 1, low: 2 };
    const ordered = [...currentRecords.values()].sort((a, b) => {
      const ia = importanceRank[a.analysis?.importance] ?? 9;
      const ib = importanceRank[b.analysis?.importance] ?? 9;
      if (ia !== ib) return ia - ib;
      const da = a.normalized_deadline?.normalized || null;
      const db = b.normalized_deadline?.normalized || null;
      if (da && db && da !== db) return da.localeCompare(db);
      if (Boolean(da) !== Boolean(db)) return da ? -1 : 1;
      return (b.received_epoch || 0) - (a.received_epoch || 0);
    });
    resultsNode.replaceChildren();
    statsNode.textContent = strings[language].resultCount(ordered.length);
    for (const record of ordered) {
      const t = strings[language];
      const analysis = record.analysis || {};
      const card = makeText("article", "card", "");
      card.append(makeText("div", "title", record.subject || "(no subject)"));
      card.append(makeText("div", "meta", [record.sender, record.received_at].filter(Boolean).join(" · ")));
      card.append(makeText("span", "badge " + (analysis.importance || ""), t.importance + ": " + (analysis.importance || "—")));
      card.append(makeText("span", "badge", t.category + ": " + (analysis.category || "—")));
      if (record.truncated_for_provider) card.append(makeText("div", "card-warning", t.bodyTrimmed));
      const add = (label, value) => {
        if (value === null || value === undefined || value === "") return;
        const field = makeText("div", "field", "");
        field.append(makeText("b", "", label), makeText("span", "", String(value)));
        card.append(field);
      };
      add(t.summary, analysis.email_summary);
      const actionValue = analysis.requires_action
        ? ((analysis.action?.type || "") + (analysis.action?.target ? " — " + analysis.action.target : ""))
        : t.noAction;
      add(t.action, actionValue);
      add(t.reply, analysis.requires_reply ? "Yes" : "No");
      if (record.normalized_deadline) {
        add(t.deadline, record.normalized_deadline.normalized || "—");
        add(t.rawDeadline, record.normalized_deadline.raw_text || "");
      }
      if (analysis.expected_event) {
        add(t.event, analysis.expected_event.event || "");
        add(t.eventSource, analysis.expected_event.raw_text || "");
      }
      if (analysis.requires_action) {
        const label = makeText("label", "completion", "");
        const check = document.createElement("input");
        check.type = "checkbox";
        check.checked = Boolean(record.completed);
        label.append(check, makeText("span", "", t.complete));
        check.addEventListener("change", async () => {
          record.completed = check.checked;
          await saveRecord(record);
        });
        card.append(label);
      }
      const details = document.createElement("details");
      details.append(makeText("summary", "", t.source));
      details.append(makeText("pre", "", record.body_text || "(正文未保存在缓存中；本次读取只保留结构化结果。)"));
      card.append(details);
      resultsNode.append(card);
    }
  }

  function normalizeReceivedDate(email, rowDate) {
    if (email.received_at) {
      if (/^\s*\d{1,2}:\d{2}\s*(am|pm)?\s*$/i.test(email.received_at)) return rowDate || null;
      const parsed = parseDateText(email.received_at, new Date());
      if (parsed) return parsed;
    }
    return rowDate || null;
  }

  async function analyzeOne(email, descriptor, receivedDate, cacheKey, apiKey) {
    const payloadEmail = {
      message_id: email.message_id,
      subject: email.subject,
      sender: email.sender,
      received_at: email.received_at || (receivedDate ? receivedDate.toISOString() : null),
      timezone: email.timezone,
      body_text: email.body_text,
      links: linksInput.checked
        ? email.links.slice(0, 5).map((link) => ({ label: link.label.slice(0, 180), url: link.url.slice(0, 512) }))
        : email.links.slice(0, 20).map((link) => ({ label: link.label.slice(0, 180) }))
    };
    let response = null;
    let sizeRetries = 0;
    let quotaRetried = false;
    let truncatedForProvider = false;
    while (true) {
      const estimate = estimateTokens(payloadEmail);
      await waitForProviderCapacity(estimate);
      if (stopRequested) return { stopped: true };
      response = await chrome.runtime.sendMessage({
        type: "MAILMATE_ANALYZE_CURRENT_EMAIL",
        payload: { apiKey, language, email: payloadEmail }
      });
      lastRequestAt = Date.now();

      if (response?.ok) {
        tokenWindow.push({ at: lastRequestAt, tokens: Number(response.usage?.total_tokens || estimate) });
        break;
      }

      if (response?.status === 413 && sizeRetries < 4 && payloadEmail.body_text.length > 1200) {
        const nextLimit = Math.max(1200, Math.floor(payloadEmail.body_text.length / 2));
        payloadEmail.body_text = clipBodyForRetry(email.body_text, nextLimit);
        truncatedForProvider = true;
        sizeRetries++;
        setStatus(strings[language].payloadRetry(payloadEmail.body_text.length));
        continue;
      }

      if (response?.status === 429 && !quotaRetried && response.retryAfter && response.retryAfter <= 30) {
        quotaRetried = true;
        const waitSeconds = Number(response.retryAfter);
        setStatus(strings[language].retrying(waitSeconds));
        await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
        if (stopRequested) return { stopped: true };
        continue;
      }

      const error = new Error(response?.error || "Analysis failed.");
      error.status = response?.status || 0;
      error.retryAfter = response?.retryAfter || null;
      throw error;
    }

    const normalizedDeadline = normalizeDeadline(response.analysis.user_deadline, receivedDate || normalizeReceivedDate(email, null));
    const record = {
      cache_key: cacheKey,
      message_id: email.message_id || descriptor.stableId,
      subject: email.subject || descriptor.subject,
      sender: email.sender || "",
      received_at: email.received_at || (receivedDate ? receivedDate.toISOString() : ""),
      received_epoch: receivedDate ? receivedDate.getTime() : 0,
      analysis: response.analysis,
      normalized_deadline: normalizedDeadline,
      completed: false,
      usage: response.usage || null,
      truncated_for_provider: truncatedForProvider,
      body_text: email.body_text
    };
    currentRecords.set(cacheKey, record);
    renderRecords();
    await saveRecord(record);
    return { cached: false, record };
  }

  function bestRowDate(email, descriptor) {
    const fromMessage = normalizeReceivedDate(email, null);
    return fromMessage || descriptor.receivedDate || null;
  }

  async function clearCache() {
    try {
      await chrome.storage.local.remove(CACHE_KEY);
      persistentCache = {};
      currentRecords.clear();
      renderRecords();
      setStatus(strings[language].cacheCleared, "ok");
    } catch {
      setStatus(strings[language].cacheError, "error");
    }
  }

  function setBusy(isBusy) {
    running = isBusy;
    startButton.disabled = isBusy;
    stopButton.disabled = !isBusy;
    languageSelect.disabled = isBusy;
    keyInput.disabled = isBusy;
    consentInput.disabled = isBusy;
    unreadInput.disabled = isBusy;
    linksInput.disabled = isBusy;
    cacheInput.disabled = isBusy;
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function runBatch() {
    if (running) return;
    const t = strings[language];
    if (!consentInput.checked) return setStatus(t.needConsent, "error");
    if (!unreadInput.checked) return setStatus(t.needUnread, "error");
    const apiKey = keyInput.value.trim();
    if (apiKey.length < 20) return setStatus(t.needKey, "error");

    const selector = chooseRowSelector();
    if (!selector) return setStatus(t.noList, "error");
    const allRows = visibleRows(selector);
    if (!allRows.length) return setStatus(t.noRows, "error");

    setBusy(true);
    stopRequested = false;
    currentRecords = new Map();
    resultsNode.replaceChildren();
    statsNode.textContent = "";
    setStatus(t.scanning);
    if (cacheInput.checked) await loadCache();

    const firstDescriptor = allRows.map(describeRow).find(isSelectedRowDescriptor);
    const initialScrollContainer = findScrollContainer(allRows[0]);
    const originalPosition = scrollPosition(initialScrollContainer);
    const initialSelectedKey = firstDescriptor ? firstDescriptor.key : null;
    scrollToPosition(initialScrollContainer, 0);
    await delay(400);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 14);
    cutoff.setHours(0, 0, 0, 0);

    const seen = new Set();
    let recentCount = 0;
    let reusedCount = 0;
    let analyzedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    let oldStreak = 0;
    let unknownStreak = 0;
    let noProgress = 0;
    let stopForQuota = false;
    let stoppedOnError = false;
    let exhausted = false;

    try {
      while (!stopRequested && !exhausted) {
        const rows = visibleRows(selector).map(describeRow);
        if (!rows.length) break;
        const fresh = rows.filter((item) => !seen.has(item.key));
        if (!fresh.length) {
          if (atScrollEnd(initialScrollContainer)) break;
          const before = scrollPosition(initialScrollContainer);
          scrollDown(initialScrollContainer);
          await delay(450);
          if (Math.abs(scrollPosition(initialScrollContainer) - before) < 3) {
            noProgress++;
            if (noProgress >= 3) break;
          } else noProgress = 0;
          continue;
        }
        noProgress = 0;

        for (const descriptor of fresh) {
          if (stopRequested || exhausted) break;
          seen.add(descriptor.key);
          let messageDate = descriptor.receivedDate;
          if (messageDate && messageDate < cutoff) {
            oldStreak++;
            skippedCount++;
            if (oldStreak >= 3) exhausted = true;
            continue;
          }
          oldStreak = 0;

          let email = null;
          if (!messageDate) {
            email = await readOpenedRow(descriptor, selector);
            if (!email) {
              failedCount++;
              unknownStreak++;
              setStatus(t.noBody, "error");
              if (unknownStreak >= 8) {
                setStatus(t.tooManyUnknown, "error");
                exhausted = true;
              }
              continue;
            }
            messageDate = bestRowDate(email, descriptor);
            if (!messageDate) {
              unknownStreak++;
              skippedCount++;
              setStatus(t.unknownDate, "error");
              if (unknownStreak >= 8) {
                setStatus(t.tooManyUnknown, "error");
                exhausted = true;
              }
              continue;
            }
          }
          if (messageDate < cutoff) {
            oldStreak++;
            skippedCount++;
            if (oldStreak >= 3) exhausted = true;
            continue;
          }
          oldStreak = 0;
          unknownStreak = 0;

          const cacheKey = await cacheKeyForRow(descriptor, messageDate);
          recentCount++;
          if (cacheInput.checked && reuseCachedRecord(cacheKey)) {
            reusedCount++;
            setStatus(t.progress(recentCount, recentCount, descriptor.subject), "ok");
            continue;
          }

          if (!email) {
            setStatus(t.opening(descriptor.subject));
            email = await readOpenedRow(descriptor, selector);
          }
          if (!email || !email.body_text || email.body_text.length < 20) {
            failedCount++;
            setStatus(t.noBody, "error");
            continue;
          }

          const actualDate = bestRowDate(email, descriptor) || messageDate;
          if (!actualDate || actualDate < cutoff) {
            skippedCount++;
            if (actualDate && actualDate < cutoff) oldStreak++;
            if (oldStreak >= 3) exhausted = true;
            continue;
          }

          let result;
          try {
            result = await analyzeOne(email, descriptor, actualDate, cacheKey, apiKey);
          } catch (error) {
            if (error?.status !== 413) throw error;
            failedCount++;
            setStatus(t.payloadTooLarge, "error");
            continue;
          }
          if (result?.stopped || stopRequested) break;
          analyzedCount++;
          setStatus(t.progress(recentCount, recentCount, descriptor.subject), "ok");
          if (result.record) currentRecords.set(result.record.cache_key, result.record);
          renderRecords();
        }

        if (stopRequested || exhausted) break;
        if (atScrollEnd(initialScrollContainer)) break;
        const before = scrollPosition(initialScrollContainer);
        scrollDown(initialScrollContainer);
        await delay(450);
        if (Math.abs(scrollPosition(initialScrollContainer) - before) < 3) {
          noProgress++;
          if (noProgress >= 3) break;
        } else noProgress = 0;
      }
    } catch (error) {
      stoppedOnError = true;
      if (error?.status === 429) {
        stopForQuota = true;
        setStatus(t.quota, "error");
      } else if (error?.status === 413) {
        setStatus(t.payloadTooLarge, "error");
      } else if (error?.status === 401 || error?.status === 403) {
        setStatus(t.authError, "error");
      } else {
        setStatus(t.errPrefix + (error?.message || String(error)), "error");
      }
    } finally {
      scrollToPosition(initialScrollContainer, originalPosition);
      await delay(250);
      if (initialSelectedKey) {
        const originalRow = findRow(selector, initialSelectedKey);
        if (originalRow) originalRow.click();
      }
      setBusy(false);
      renderRecords();
      if (stopRequested) setStatus(t.stopped, "ok");
      else if (!stopForQuota && !stoppedOnError) {
        setStatus(t.finished(recentCount, reusedCount, analyzedCount, skippedCount, failedCount), "ok");
      }
    }
  }

  function isSelectedRowDescriptor(descriptor) {
    return descriptor && isSelectedRow(descriptor.element);
  }

  launcher.addEventListener("click", () => { panel.hidden = !panel.hidden; });
  $(".close").addEventListener("click", () => { panel.hidden = true; });
  languageSelect.addEventListener("change", () => {
    setLanguage(languageSelect.value);
    chrome.storage.local.set({ [LANGUAGE_KEY]: language }).catch(() => {});
  });
  startButton.addEventListener("click", () => { runBatch(); });
  stopButton.addEventListener("click", () => { stopRequested = true; setStatus(strings[language].stopped); });
  clearButton.addEventListener("click", () => { clearCache(); });

  chrome.storage.local.get(LANGUAGE_KEY).then((value) => {
    if (value && (value[LANGUAGE_KEY] === "zh" || value[LANGUAGE_KEY] === "en")) setLanguage(value[LANGUAGE_KEY]);
  }).catch(() => {});

  setLanguage(language);
})();
