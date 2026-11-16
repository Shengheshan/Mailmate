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
      caption: "近两周邮件 · 重要事项",
      actionCount: "条需行动",
      deadlineCount: "封有截止日期",
      search: "搜索摘要、行动或分类",
      all: "全部",
      pending: "未完成",
      completed: "已完成",
      sort: "重要性优先 · 截止日期升序",
      columns: ["重要性", "分类", "邮件内容（汇总）", "截止日期（标准化）", "截止日期（原文）", "需要行动", "是否完成"],
      importanceLabels: { high: "高", medium: "中", low: "低" },
      categoryLabels: { administration: "行政通知", career: "职业发展", course: "课程", other: "其他", project: "项目", research: "研究" },
      actionTypes: { none: "无", submit: "提交", reply_confirm: "回复确认", reply_availability: "回复并说明时间", reply_interest: "回复表达意向", send: "发送", review: "复核", revise: "修改", check: "查看", read: "阅读", download: "下载", register: "报名", attend: "参加", complete: "完成", confirm: "确认", save: "保存" },
      noDeadline: "—",
      unresolvedDeadline: "待确认",
      noMatches: "没有匹配的邮件",
      searchHint: "试试其他关键词或筛选条件。",
      settings: "设置",
      previewEmail: "原文细节预览",
      previewDeadline: "截止日期原文片段",
      originalEmail: "原文邮件",
      emailUnavailable: "这封邮件的正文未保存在本地缓存中。",
      bilingualMissing: "缺少此语言的摘要，请重新分析这封邮件。",
      originalOnly: "邮件原文保持原语言显示。",
      completionCount: (done, total) => "已完成 " + done + " / " + total,
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
      caption: "Last two weeks · Key items",
      actionCount: "action items",
      deadlineCount: "emails with deadlines",
      search: "Search summaries, actions, or categories",
      all: "All",
      pending: "Open",
      completed: "Done",
      sort: "Importance first · Earliest deadline next",
      columns: ["Importance", "Category", "Email summary", "Deadline (normalized)", "Deadline (original)", "Action", "Done"],
      importanceLabels: { high: "High", medium: "Medium", low: "Low" },
      categoryLabels: { administration: "Administration", career: "Career", course: "Course", other: "Other", project: "Project", research: "Research" },
      actionTypes: { none: "None", submit: "Submit", reply_confirm: "Confirm by reply", reply_availability: "Reply with availability", reply_interest: "Reply with interest", send: "Send", review: "Review", revise: "Revise", check: "Check", read: "Read", download: "Download", register: "Register", attend: "Attend", complete: "Complete", confirm: "Confirm", save: "Save" },
      noDeadline: "—",
      unresolvedDeadline: "Needs review",
      noMatches: "No matching emails",
      searchHint: "Try another search term or filter.",
      settings: "Settings",
      previewEmail: "Original email preview",
      previewDeadline: "Deadline source excerpt",
      originalEmail: "Original email",
      emailUnavailable: "This email body was not saved in the local cache.",
      bilingualMissing: "This language's summary is unavailable. Reanalyze this email.",
      originalOnly: "The original email remains in its source language.",
      completionCount: (done, total) => "Completed " + done + " / " + total,
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
    ".foot{margin:8px 0 0;color:#6b7788;font-size:10px}",
    ".panel{display:flex;flex-direction:column;height:auto;min-height:0;overflow:hidden}",
    ".panel.show-results{right:22px;bottom:18px;width:min(1190px,calc(100vw - 32px));height:min(700px,calc(100vh - 36px));max-height:none}",
    ".panel.is-minimized{height:68px;min-height:68px}.panel.is-minimized .content{display:none}",
    ".panel .card-header{min-height:76px;display:flex;gap:14px;padding:12px 16px}",
    ".brand-lockup{display:flex;align-items:center;gap:10px;min-width:190px}",
    ".brand-icon{width:36px;height:36px;display:grid;place-items:center;border-radius:11px;color:#fff;background:linear-gradient(145deg,#7387ff,#4f68ed 64%,#4157da);font-weight:800}",
    ".brand-name{font-size:15px;font-weight:800;color:#202b3c}.brand-caption{margin-top:3px;color:#8993a3;font-size:10px}",
    ".header-summary{display:none;flex-wrap:wrap;align-items:center;gap:7px;margin-left:auto}.panel.show-results .header-summary{display:flex}",
    ".summary-stat{padding:6px 8px;border:1px solid #edf0f5;border-radius:8px;color:#738094;background:#fff;font-size:10px;white-space:nowrap}",
    ".summary-stat strong{color:#344154;font-size:11px}",
    ".language-control{display:flex;align-items:center;gap:6px;margin:0;color:#7b8697;font-size:10px;white-space:nowrap}",
    ".language-control select{width:auto;padding:6px 8px;font-size:11px}",
    ".window-actions{display:flex;gap:4px;flex-shrink:0}",
    ".window-actions button,.settings-open{border:0;border-radius:7px;padding:6px 9px;color:#647187;background:#f2f4f8;font:600 11px system-ui,sans-serif;cursor:pointer}",
    ".content{min-height:0;display:flex;flex:1;flex-direction:column;padding:0 16px 12px}",
    ".setup-view{overflow:auto;padding-top:12px}.setup-view[hidden]{display:none}",
    ".results-view{min-height:0;display:flex;flex:1;flex-direction:column}.results-view[hidden]{display:none}",
    ".result-status{min-height:20px;margin:5px 0;color:#647187;font-size:11px}.result-status.error{color:#a32828}.result-status.ok{color:#116149}",
    ".toolbar{min-height:52px;display:flex;align-items:center;gap:9px;flex-wrap:wrap}",
    ".search-box{width:min(280px,32%);height:33px;display:flex;align-items:center;gap:7px;padding:0 9px;border:1px solid #e7eaf0;border-radius:8px;background:#fcfcfe}",
    ".search-box input{width:100%;border:0;outline:0;color:#344154;background:transparent;font-size:11px}",
    ".filter-group{display:flex;gap:2px;padding:3px;border:1px solid #edf0f4;border-radius:8px;background:#f7f8fb}",
    ".filter-button{height:27px;padding:0 9px;border:0;border-radius:6px;color:#7d8797;background:transparent;font-size:10px;white-space:nowrap;cursor:pointer}",
    ".filter-button.active{color:#3e52c9;background:#fff;box-shadow:0 1px 3px #27385d16;font-weight:600}",
    ".filter-button span{margin-left:3px;color:#9aa3b2}",
    ".sort-note{margin-left:auto;color:#8a94a4;font-size:10px;white-space:nowrap}",
    ".table-frame{min-height:0;flex:1;overflow:auto;border:1px solid #ebedf2;border-radius:9px;scrollbar-color:#d6dae4 transparent;scrollbar-width:thin}",
    ".results-table{width:100%;min-width:1100px;border-collapse:separate;border-spacing:0;table-layout:fixed;text-align:left}",
    ".results-table .col-importance{width:86px}.results-table .col-category{width:94px}.results-table .col-summary{width:250px}.results-table .col-normalized{width:177px}.results-table .col-raw{width:220px}.results-table .col-action{width:230px}.results-table .col-completed{width:88px}",
    ".results-table thead{position:sticky;z-index:2;top:0}",
    ".results-table th{height:40px;padding:0 10px;border-bottom:1px solid #e9ecf2;color:#8791a0;background:#f8f9fc;font-size:10px;font-weight:600;white-space:nowrap}",
    ".results-table td{height:57px;padding:8px 10px;border-bottom:1px solid #f0f2f6;color:#485568;background:#fff;font-size:11px;vertical-align:middle}",
    ".results-table tbody tr:hover td{background:#fafbff}.results-table tbody tr.is-completed td{color:#9ba4b2;background:#fbfcfd}.results-table tbody tr.is-completed .summary-text{text-decoration:line-through}",
    ".importance-pill{display:inline-flex;align-items:center;padding:4px 7px;border-radius:6px;font-size:10px;font-weight:600;white-space:nowrap}.importance-high{color:#c75757;background:#fff0ef}.importance-medium{color:#b27a27;background:#fff6e7}.importance-low{color:#708095;background:#f1f3f7}",
    ".category-label{color:#59677b;font-size:10px;white-space:nowrap}",
    ".summary-cell{overflow:hidden}.summary-trigger,.deadline-trigger{display:block;width:100%;padding:0;overflow:hidden;border:0;text-align:left;background:transparent;cursor:pointer}",
    ".summary-text{display:-webkit-box;overflow:hidden;color:#273449;font-size:11px;font-weight:600;line-height:1.5;-webkit-box-orient:vertical;-webkit-line-clamp:2}.summary-trigger:hover .summary-text,.deadline-trigger:hover .raw-date{color:#465de0;text-decoration:underline;text-underline-offset:2px}",
    ".summary-subject{display:block;overflow:hidden;margin-top:3px;color:#a2aab6;font-size:9px;text-overflow:ellipsis;white-space:nowrap}",
    ".summary-warning{display:inline-block;margin-top:3px;color:#9a6a18;font-size:9px}",
    ".deadline-date{color:#354259;font-size:10px;white-space:nowrap}.deadline-date.empty{color:#b0b7c3}.deadline-date.unresolved{color:#bc842d}",
    ".raw-date{display:-webkit-box;overflow:hidden;color:#8490a0;font-size:10px;line-height:1.5;-webkit-box-orient:vertical;-webkit-line-clamp:2}",
    ".action-text{display:-webkit-box;overflow:hidden;color:#59677a;font-size:10px;line-height:1.5;-webkit-box-orient:vertical;-webkit-line-clamp:2}.action-required{color:#33445d}.no-action{color:#a2aab6}",
    ".checkbox-cell{text-align:center}.completion-checkbox{width:16px;height:16px;margin:0;accent-color:#5d71e8;cursor:pointer;vertical-align:middle}",
    ".empty-state{min-height:180px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;color:#99a2b0;font-size:11px}.empty-state[hidden]{display:none}.empty-state strong{color:#536074;font-size:13px}",
    ".results-footer{min-height:33px;display:flex;align-items:center;justify-content:space-between;gap:12px;color:#929cab;font-size:9px}",
    ".source-preview{position:fixed;z-index:30;width:min(390px,calc(100vw - 24px));max-height:min(390px,calc(100vh - 24px));overflow:auto;padding:14px;border:1px solid #e4e8f0;border-radius:12px;color:#354154;background:#fff;box-shadow:0 16px 46px #25345430;font:11px/1.6 system-ui,sans-serif}.source-preview[hidden]{display:none}.preview-title{color:#253248;font-size:12px;font-weight:700}.preview-meta,.preview-note{margin-top:4px;color:#8d97a6;font-size:9px}.preview-body{max-height:190px;overflow:auto;margin-top:9px;padding:10px;border:1px solid #e9ecf2;border-radius:7px;background:#fcfcfd;white-space:pre-wrap;overflow-wrap:anywhere}.preview-body mark{background:#fff0bd;color:#725016}",
    ".modal-layer{position:fixed;z-index:40;inset:0;display:grid;place-items:center;padding:24px;background:#15213b66}.modal-layer[hidden]{display:none}.message-modal{width:min(780px,calc(100vw - 32px));max-height:min(80vh,760px);display:flex;flex-direction:column;overflow:hidden;border:1px solid #e5e8f0;border-radius:14px;background:#fff;box-shadow:0 24px 70px #111b33a0}.modal-header{display:flex;justify-content:space-between;gap:12px;padding:16px 18px;border-bottom:1px solid #edf0f5}.modal-title{font-size:14px;font-weight:700}.modal-meta{margin-top:4px;color:#8490a0;font-size:10px}.modal-body{overflow:auto;padding:18px;color:#354154;font-size:12px;line-height:1.7;white-space:pre-wrap;overflow-wrap:anywhere}.modal-close{border:0;background:transparent;font-size:22px;cursor:pointer}.modal-footer{padding:10px 18px;border-top:1px solid #edf0f5;color:#929cab;font-size:10px}",
    "@media(max-width:720px){.panel.show-results{right:8px;bottom:8px;width:calc(100vw - 16px);height:calc(100vh - 16px)}.panel .card-header{gap:7px;padding:10px}.brand-lockup{min-width:0}.header-summary{display:none}.language-control span{display:none}.content{padding:0 9px 8px}.toolbar{gap:6px}.sort-note{display:none}.search-box{width:100%;max-width:none}.results-table{min-width:1060px}}"
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
    ' <header class="card-header">',
    '  <div class="brand-lockup"><div class="brand-icon">M</div><div><div class="brand-name"></div><div class="brand-caption"></div></div></div>',
    '  <div class="header-summary"></div>',
    '  <label class="language-control"><span class="language-label"></span><select class="language"><option value="zh"></option><option value="en"></option></select></label>',
    '  <div class="window-actions"><button class="minimize" type="button" aria-label="Minimize">−</button><button class="close" type="button" aria-label="Close">×</button></div>',
    ' </header>',
    ' <div class="content">',
    '  <section class="setup-view">',
    '  <p class="hint intro"></p>',
    '  <label class="key-label"></label><input class="api-key" type="password" autocomplete="off" spellcheck="false">',
    '  <label class="check"><input class="consent" type="checkbox"><span class="consent-text"></span></label>',
    '  <label class="check"><input class="unread-confirm" type="checkbox"><span class="unread-text"></span></label>',
    '  <label class="check"><input class="send-links" type="checkbox"><span class="links-text"></span></label>',
    '  <label class="check"><input class="cache-enabled" type="checkbox" checked><span class="cache-text"></span></label>',
    '  <div class="buttons"><button class="primary start" type="button"></button><button class="secondary stop" type="button" disabled></button><button class="secondary clear" type="button"></button></div>',
    '  <p class="status" aria-live="polite"></p>',
    '  <p class="foot unread-note"></p>',
    '  </section>',
    '  <section class="results-view" hidden>',
    '   <p class="result-status" aria-live="polite"></p>',
    '   <div class="toolbar">',
    '    <label class="search-box"><span aria-hidden="true">⌕</span><input class="search-input" type="search" autocomplete="off"></label>',
    '    <div class="filter-group" role="group"><button class="filter-button active" data-filter="all" type="button"></button><button class="filter-button" data-filter="pending" type="button"></button><button class="filter-button" data-filter="completed" type="button"></button></div>',
    '    <span class="sort-note"></span><button class="settings-open" type="button"></button>',
    '   </div>',
    '   <div class="table-frame"><table class="results-table"><colgroup><col class="col-importance"><col class="col-category"><col class="col-summary"><col class="col-normalized"><col class="col-raw"><col class="col-action"><col class="col-completed"></colgroup><thead><tr><th></th><th></th><th></th><th></th><th></th><th></th><th></th></tr></thead><tbody class="result-rows"></tbody></table><div class="empty-state" hidden><strong></strong><span></span></div></div>',
    '   <footer class="results-footer"><span class="result-footer-left"></span><span class="result-footer-right"></span></footer>',
    '  </section>',
    '  <div class="source-preview" role="tooltip" hidden></div>',
    '  <div class="modal-layer" hidden><section class="message-modal" role="dialog" aria-modal="true"><header class="modal-header"><div><div class="modal-title"></div><div class="modal-meta"></div></div><button class="modal-close" type="button" aria-label="Close">×</button></header><div class="modal-body"></div><footer class="modal-footer"></footer></section></div>',
    ' </div>',
    '</section>'
  ].join("");
  shadow.append(style, root);

  const $ = (selector) => root.querySelector(selector);
  const launcher = $(".launcher");
  const panel = $(".panel");
  const languageSelect = $(".language");
  const setupView = $(".setup-view");
  const resultsView = $(".results-view");
  const resultRows = $(".result-rows");
  const searchInput = $(".search-input");
  const emptyState = $(".empty-state");
  const headerSummary = $(".header-summary");
  const resultStatusNode = $(".result-status");
  const filterButtons = [...root.querySelectorAll(".filter-button")];
  const keyInput = $(".api-key");
  const consentInput = $(".consent");
  const unreadInput = $(".unread-confirm");
  const linksInput = $(".send-links");
  const cacheInput = $(".cache-enabled");
  const startButton = $(".start");
  const stopButton = $(".stop");
  const clearButton = $(".clear");
  const statusNode = $(".status");
  let language = (navigator.language || "en").toLowerCase().startsWith("zh") ? "zh" : "en";
  let running = false;
  let stopRequested = false;
  let persistentCache = {};
  let currentRecords = new Map();
  let currentFilter = "all";
  let hoverTimer = 0;
  let activePreviewTrigger = null;
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
    $(".brand-name").textContent = "Mailmate";
    $(".brand-caption").textContent = t.caption;
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
    searchInput.placeholder = t.search;
    const headings = root.querySelectorAll(".results-table thead th");
    t.columns.forEach((label, index) => { headings[index].textContent = label; });
    $(".sort-note").textContent = t.sort;
    $(".settings-open").textContent = t.settings;
    $(".empty-state strong").textContent = t.noMatches;
    $(".empty-state span").textContent = t.searchHint;
    $(".modal-close").setAttribute("aria-label", language === "zh" ? "关闭" : "Close");
    renderRecords();
  }

  function showSettingsView() {
    setupView.hidden = false;
    resultsView.hidden = true;
    panel.classList.remove("show-results");
  }

  function showResultsView() {
    setupView.hidden = true;
    resultsView.hidden = false;
    panel.classList.add("show-results");
  }

  function setStatus(message, kind) {
    statusNode.textContent = message || "";
    statusNode.className = "status" + (kind ? " " + kind : "");
    if (resultStatusNode) {
      resultStatusNode.textContent = message || "";
      resultStatusNode.className = "result-status" + (kind ? " " + kind : "");
    }
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
    if (!stored || typeof stored.analysis?.email_summary_en !== "string" || typeof stored.analysis?.email_summary_zh !== "string") return false;
    const cached = { ...stored, cache_key: cacheKey, body_text: "" };
    currentRecords.set(cacheKey, cached);
    renderRecords();
    return true;
  }

  function localizedSummary(analysis) {
    const value = language === "zh" ? analysis.email_summary_zh : analysis.email_summary_en;
    return typeof value === "string" && value.trim() ? value : strings[language].bilingualMissing;
  }

  function localizedTarget(action) {
    return language === "zh"
      ? (action.target_zh || "")
      : (action.target_en || "");
  }

  function localizedEvent(event) {
    return language === "zh"
      ? (event?.event_zh || "")
      : (event?.event_en || "");
  }

  function actionText(analysis) {
    const t = strings[language];
    if (!analysis.requires_action) return t.noAction;
    const type = analysis.action?.type || "none";
    const verb = t.actionTypes[type] || type;
    const target = localizedTarget(analysis.action || {});
    return [verb, target].filter(Boolean).join(language === "zh" ? "：" : ": ");
  }

  function normalizedDeadlineText(deadline) {
    const t = strings[language];
    if (!deadline) return { text: t.noDeadline, kind: "empty" };
    if (!deadline.normalized) return { text: t.unresolvedDeadline, kind: "unresolved" };
    return { text: String(deadline.normalized).replace("T", " ").replace(/:00$/, ""), kind: "" };
  }

  function updateSummaryHeader(ordered) {
    const t = strings[language];
    const actions = ordered.filter((record) => record.analysis?.requires_action).length;
    const deadlines = ordered.filter((record) => Boolean(record.normalized_deadline?.raw_text)).length;
    headerSummary.replaceChildren();
    for (const [count, label, type] of [[actions, t.actionCount, "action"], [deadlines, t.deadlineCount, "deadline"]]) {
      const stat = makeText("span", "summary-stat " + type, "");
      stat.append(makeText("strong", "", count), document.createTextNode(" " + label));
      headerSummary.append(stat);
    }
  }

  function bindSourcePreview(trigger, record, kind) {
    const scheduleHide = () => {
      window.clearTimeout(hoverTimer);
      hoverTimer = window.setTimeout(() => { $(".source-preview").hidden = true; }, 170);
    };
    trigger.addEventListener("pointerenter", () => {
      window.clearTimeout(hoverTimer);
      hoverTimer = window.setTimeout(() => showSourcePreview(trigger, record, kind), 260);
    });
    trigger.addEventListener("pointerleave", scheduleHide);
    trigger.addEventListener("focus", () => showSourcePreview(trigger, record, kind));
    trigger.addEventListener("blur", scheduleHide);
    if (kind === "deadline") {
      trigger.addEventListener("click", (event) => {
        event.preventDefault();
        const preview = $(".source-preview");
        if (!preview.hidden && activePreviewTrigger === trigger) preview.hidden = true;
        else showSourcePreview(trigger, record, kind);
      });
    }
  }

  function showSourcePreview(trigger, record, kind) {
    const preview = $(".source-preview");
    const t = strings[language];
    const deadline = record.normalized_deadline || {};
    preview.replaceChildren();
    const title = kind === "deadline" ? (deadline.raw_text || localizedSummary(record.analysis || {})) : (record.subject || localizedSummary(record.analysis || {}));
    preview.append(makeText("div", "preview-title", kind === "deadline" ? t.previewDeadline : t.previewEmail));
    preview.append(makeText("div", "modal-meta", title));
    preview.append(makeText("div", "preview-meta", [record.sender, record.received_at].filter(Boolean).join(" · ")));
    const bodyText = String(record.body_text || "");
    const body = makeText("div", "preview-body", "");
    if (!bodyText) {
      body.textContent = t.emailUnavailable;
    } else if (kind === "deadline" && deadline.raw_text) {
      const index = bodyText.toLocaleLowerCase().indexOf(String(deadline.raw_text).toLocaleLowerCase());
      const start = index < 0 ? 0 : Math.max(0, index - 180);
      const excerpt = bodyText.slice(start, index < 0 ? 520 : Math.min(bodyText.length, index + deadline.raw_text.length + 260));
      const matchIndex = index < 0 ? -1 : index - start;
      if (matchIndex >= 0) {
        body.append(document.createTextNode(excerpt.slice(0, matchIndex)));
        const mark = makeText("mark", "", deadline.raw_text);
        body.append(mark, document.createTextNode(excerpt.slice(matchIndex + deadline.raw_text.length)));
      } else body.textContent = excerpt;
    } else body.textContent = bodyText.slice(0, 520) + (bodyText.length > 520 ? "…" : "");
    preview.append(body, makeText("div", "preview-note", t.originalOnly));
    const rect = trigger.getBoundingClientRect();
    preview.hidden = false;
    activePreviewTrigger = trigger;
    const width = Math.min(390, window.innerWidth - 24);
    const height = Math.min(preview.scrollHeight, window.innerHeight - 24);
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
    let top = rect.bottom + 8;
    if (top + height > window.innerHeight - 12) top = rect.top - height - 8;
    preview.style.left = left + "px";
    preview.style.top = Math.max(12, top) + "px";
  }

  function openSourceModal(record) {
    const modal = $(".modal-layer");
    const deadline = record.normalized_deadline;
    $(".modal-title").textContent = record.subject || localizedSummary(record.analysis || {});
    $(".message-modal .modal-meta").textContent = [record.sender, record.received_at].filter(Boolean).join(" · ");
    $(".modal-body").textContent = record.body_text || strings[language].emailUnavailable;
    $(".modal-footer").textContent = [strings[language].originalOnly, deadline?.raw_text].filter(Boolean).join(" · ");
    $(".source-preview").hidden = true;
    modal.hidden = false;
    $(".modal-close").focus();
  }

  function makeTableRow(record) {
    const t = strings[language];
    const analysis = record.analysis || {};
    const importance = ["high", "medium", "low"].includes(analysis.importance) ? analysis.importance : "low";
    const row = document.createElement("tr");
    row.classList.toggle("is-completed", Boolean(record.completed));

    const importanceCell = document.createElement("td");
    importanceCell.append(makeText("span", "importance-pill importance-" + importance, t.importanceLabels[importance]));
    const categoryCell = document.createElement("td");
    categoryCell.append(makeText("span", "category-label", t.categoryLabels[analysis.category] || analysis.category || t.categoryLabels.other));

    const summaryCell = makeText("td", "summary-cell", "");
    const summaryButton = makeText("button", "summary-trigger", "");
    summaryButton.type = "button";
    summaryButton.setAttribute("aria-label", (language === "zh" ? "查看邮件原文：" : "View original email: ") + localizedSummary(analysis));
    summaryButton.append(makeText("span", "summary-text", localizedSummary(analysis) || record.subject));
    summaryButton.append(makeText("span", "summary-subject", record.subject || ""));
    if (record.truncated_for_provider) summaryButton.append(makeText("span", "summary-warning", t.bodyTrimmed));
    summaryButton.addEventListener("click", () => openSourceModal(record));
    bindSourcePreview(summaryButton, record, "email");
    summaryCell.append(summaryButton);

    const normalized = normalizedDeadlineText(record.normalized_deadline);
    const normalizedCell = makeText("td", "deadline-date " + normalized.kind, normalized.text);
    const rawCell = document.createElement("td");
    if (record.normalized_deadline?.raw_text) {
      const rawButton = makeText("button", "deadline-trigger", "");
      rawButton.type = "button";
      rawButton.setAttribute("aria-label", (language === "zh" ? "查看截止日期原文：" : "Preview deadline source: ") + record.normalized_deadline.raw_text);
      rawButton.append(makeText("span", "raw-date", record.normalized_deadline.raw_text));
      bindSourcePreview(rawButton, record, "deadline");
      rawCell.append(rawButton);
    } else rawCell.append(makeText("span", "raw-date", t.noDeadline));

    const action = makeText("span", "action-text " + (analysis.requires_action ? "action-required" : "no-action"), actionText(analysis));
    action.title = action.textContent;
    const actionCell = document.createElement("td");
    actionCell.append(action);

    const completedCell = makeText("td", "checkbox-cell", "");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "completion-checkbox";
    checkbox.checked = Boolean(record.completed);
    checkbox.setAttribute("aria-label", (language === "zh" ? "标记完成：" : "Mark complete: ") + localizedSummary(analysis));
    checkbox.addEventListener("change", async () => {
      record.completed = checkbox.checked;
      await saveRecord(record);
      renderRecords();
    });
    completedCell.append(checkbox);

    row.append(importanceCell, categoryCell, summaryCell, normalizedCell, rawCell, actionCell, completedCell);
    return row;
  }

  function renderRecords() {
    const t = strings[language];
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
    const query = searchInput.value.trim().toLocaleLowerCase();
    const filtered = ordered.filter((record) => {
      if (currentFilter === "pending" && record.completed) return false;
      if (currentFilter === "completed" && !record.completed) return false;
      if (!query) return true;
      const analysis = record.analysis || {};
      const searchable = [localizedSummary(analysis), actionText(analysis), localizedEvent(analysis.expected_event), analysis.category,
        analysis.user_deadline?.raw_text, record.subject, record.sender].join(" ").toLocaleLowerCase();
      return searchable.includes(query);
    });
    resultRows.replaceChildren(...filtered.map(makeTableRow));
    emptyState.hidden = filtered.length > 0;
    updateSummaryHeader(ordered);
    const allButton = filterButtons.find((button) => button.dataset.filter === "all");
    const pendingButton = filterButtons.find((button) => button.dataset.filter === "pending");
    const completedButton = filterButtons.find((button) => button.dataset.filter === "completed");
    allButton.replaceChildren(document.createTextNode(t.all + " "), makeText("span", "", ordered.length));
    pendingButton.replaceChildren(document.createTextNode(t.pending + " "), makeText("span", "", ordered.filter((record) => !record.completed).length));
    completedButton.replaceChildren(document.createTextNode(t.completed + " "), makeText("span", "", ordered.filter((record) => record.completed).length));
    filterButtons.forEach((button) => button.classList.toggle("active", button.dataset.filter === currentFilter));
    $(".result-footer-left").textContent = t.resultCount(ordered.length);
    $(".result-footer-right").textContent = t.completionCount(ordered.filter((record) => record.completed).length, ordered.length);
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
      completed: Boolean(persistentCache[cacheKey]?.completed),
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
    showSettingsView();
    panel.classList.remove("is-minimized");
    currentFilter = "all";
    searchInput.value = "";
    currentRecords = new Map();
    resultRows.replaceChildren();
    renderRecords();
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
      showResultsView();
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
  $(".minimize").addEventListener("click", () => { panel.classList.toggle("is-minimized"); });
  $(".settings-open").addEventListener("click", showSettingsView);
  filterButtons.forEach((button) => button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    renderRecords();
  }));
  searchInput.addEventListener("input", renderRecords);
  languageSelect.addEventListener("change", () => {
    setLanguage(languageSelect.value);
    chrome.storage.local.set({ [LANGUAGE_KEY]: language }).catch(() => {});
  });
  $(".modal-close").addEventListener("click", () => { $(".modal-layer").hidden = true; });
  $(".modal-layer").addEventListener("click", (event) => {
    if (event.target === $(".modal-layer")) $(".modal-layer").hidden = true;
  });
  $(".source-preview").addEventListener("pointerenter", () => window.clearTimeout(hoverTimer));
  $(".source-preview").addEventListener("pointerleave", () => {
    window.clearTimeout(hoverTimer);
    hoverTimer = window.setTimeout(() => { $(".source-preview").hidden = true; }, 160);
  });
  root.addEventListener("pointerdown", (event) => {
    if (!event.target.closest(".source-preview, .summary-trigger, .deadline-trigger")) $(".source-preview").hidden = true;
  });
  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      $(".modal-layer").hidden = true;
      $(".source-preview").hidden = true;
    }
  });
  startButton.addEventListener("click", () => { runBatch(); });
  stopButton.addEventListener("click", () => { stopRequested = true; setStatus(strings[language].stopped); });
  clearButton.addEventListener("click", () => { clearCache(); });

  chrome.storage.local.get(LANGUAGE_KEY).then((value) => {
    if (value && (value[LANGUAGE_KEY] === "zh" || value[LANGUAGE_KEY] === "en")) setLanguage(value[LANGUAGE_KEY]);
  }).catch(() => {});

  setLanguage(language);
})();
