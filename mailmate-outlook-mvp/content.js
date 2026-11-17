Y��x��y�Z��p��\�{-�ǥz�讷��Ƞ���z�����zŚ�x����ל���w���'�۬zW�~��y�,�	�nW�j��nW�(() => {
  const HOST_ID = "mailmate-batch-host";
  const CACHE_KEY = "mailmate-analysis-cache-v1";
  const LANGUAGE_KEY = "mailmate-language-v1";
  const API_KEY_KEY = "mailmate-groq-api-key-v1";
  const READ_STATE_CONFIRMED_KEY = "mailmate-unread-protection-confirmed-v1";
  const TELEMETRY_CONSENT_KEY = "mailmate-telemetry-enabled-v1";
  const TELEMETRY_NAME_CONSENT_KEY = "mailmate-telemetry-display-name-enabled-v1";
  const TELEMETRY_ENDPOINT = String(globalThis.MAILMATE_TELEMETRY_ENDPOINT || "");
  const MAX_BODY_CHARS = 16000;
  const MAX_CACHE_RECORDS = 500;
  const MAX_CACHE_BYTES = 7 * 1024 * 1024;
  // Current Groq project limit shown to the owner is 8K TPM / 30 RPM.
  // Keep a 5% token reserve and stay just under the request-per-minute cap.
  const FALLBACK_TOKEN_BUDGET_PER_MINUTE = 7600;
  let tokenBudgetPerMinute = FALLBACK_TOKEN_BUDGET_PER_MINUTE;
  const MIN_REQUEST_GAP_MS = 2050;
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
      key: "Groq API Key（保存在本浏览器的插件本地存储中）",
      consent: "我同意将近两周邮件的正文发送到 Groq（美国）进行分析。",
      guideEyebrow: "首次使用设置",
      guideTitles: ["打开 Outlook 设置", "选择邮件", "打开邮件处理", "关闭自动标记为已读", "确认设置并开始"],
      guideInstructions: ["点击 Outlook 页面右上角齿轮。红框会标出位置。", "在设置侧栏中点击“邮件”。", "在邮件设置列表中点击“邮件处理”。", "选择“不自动将邮件标记为已读”。请确认该选项已选中。", "请确认上方选项已选中。完成后点击按钮，Mailmate 会记住这次设置确认。"],
      guideNote: "这是右下角提示卡片，不会遮挡页面或拦截 Outlook 操作。此指引只需完成一次；插件无法读取或代替你更改这项设置。",
      guideStepLabel: (step, total) => `步骤 ${step} / ${total}`,
      guideCancel: "取消",
      guideBack: "上一步",
      guideNext: "下一步",
      guideComplete: "我已完成设置，开始分析",
      guideSaveError: "无法保存设置确认，请检查浏览器扩展存储权限后重试。",
      links: "同时把正文中的链接地址发送给模型（默认关闭；链接可能含个人专属信息）",
      cache: "将结构化结果、邮件正文和完成状态保存在本浏览器，供下次跳过已分析邮件并查看原文（不会发送到遥测服务；不保存 API Key）",
      telemetry: "分享给 Mailmate（Cloudflare）的使用统计与技术诊断（使用随机安装标识；不含邮件正文、主题、发件人、API Key 或成功生成的摘要/行动）",
      telemetryNote: "匿名使用统计默认开启。邮件收件人显示名另有独立开关，默认关闭；诊断日志保留 30 天，安装连续 90 天不活跃后清除。",
      telemetryName: "额外分享邮件中的单一收件人显示名，用于区分使用者（默认关闭）",
      telemetryNameNote: "开启后仅上传可识别的收件人显示名，不上传邮箱地址或邮件正文。停用后不再上传；已保存的显示名会在安装连续 90 天不活跃后清除。",
      telemetryUnavailable: "遥测服务尚未配置；当前不会发送统计或日志。",
      telemetryChecking: "正在检查使用统计连接…",
      telemetryConnected: "统计服务已连接；本次打开已记录。",
      telemetryQueued: (count) => `统计连接暂不可用，${count} 条事件已在本机排队，之后会重试。`,
      telemetryRejected: (status) => `统计服务拒绝了打开事件（HTTP ${status}）；请更新遥测 Worker 后重新部署。`,
      telemetryOffline: "统计服务暂不可用；打开事件会在下次使用时重试。",
      telemetryDisabled: "使用统计已关闭；本次打开不会发送统计事件。",
      telemetryIndicatorChecking: "统计检查中",
      telemetryIndicatorConnected: "统计已连接",
      telemetryIndicatorProblem: "统计待处理",
      telemetryIndicatorDisabled: "统计已关闭",
      processingTitle: "正在总结中",
      processingNote: "首次同步可能需要较长时间，耗时会随待处理邮件数量变化。请保持此标签页打开，完成后会显示汇总结果。",
      countingTitle: "正在统计近两周的邮件",
      countProgress: (checked, found) => `已检查 ${checked} 封，发现 ${found} 封日期在近两周内的邮件`,
      countEta: "统计完成后会显示日期可识别的邮件总数、分析进度和剩余时间估算。",
      countCurrent: "正在快速扫描邮件列表，不会打开邮件或调用 AI。",
      analyzingTitle: "正在分析邮件",
      analysisReady: "已统计完邮件总数，开始分析。",
      currentEmail: (current, total) => `当前正在分析第 ${current} / ${total} 封`,
      progressCount: (done, total, analyzed, reused, failed) => `已处理 ${done} / ${total} 封（新分析 ${analyzed}，缓存复用 ${reused}${failed ? `，失败 ${failed}` : ""}）`,
      etaCalculating: "正在根据 AI 响应速度估算剩余时间…",
      etaCached: "剩余邮件均可从缓存读取，无需再次调用 AI。",
      etaNoEmails: "近两周没有需要分析的邮件。",
      etaRemaining: (duration) => `预计还需约 ${duration}（按本次已完成 AI 请求的平均耗时估算）`,
      etaSeconds: (seconds) => `${seconds} 秒`,
      etaMinutes: (minutes, seconds) => seconds ? `${minutes} 分 ${seconds} 秒` : `${minutes} 分钟`,
      countIncomplete: "统计结果可能不完整：只计入日期可识别的邮件。",
      retryingItem: (attempt, max) => `当前邮件暂时无法处理，正在自动重试（${attempt}/${max}）…`,
      apologyTitle: "抱歉，本次同步中断了",
      apologyText: "请检查未处理邮件并调整设置后重试；开启本地缓存时，已完成项目会在重试时复用。",
      apologyReason: "中断原因",
      apologyRetry: "重新尝试",
      apologySettings: "返回设置",
      apologyIssues: (count) => `检查未处理邮件（${count}）`,
      issuesButton: (count) => `查看跳过 / 失败邮件（${count}）`,
      issuesTitle: "需要检查的邮件",
      issueSkipped: "跳过",
      issueFailed: "失败",
      issueReason: "原因",
      issueSubjectFallback: "无法识别主题",
      issueInspectHint: "可根据主题在 Outlook 中查找并检查原邮件。",
      missingRowsError: "重新扫描后仍未能在邮件列表中定位部分邮件。请确认仍在原文件夹且邮件列表保持最新优先，再重试。",
      emailReadError: "多次重试后仍未能读取这封邮件的正文。",
      cacheBodyError: "多次重试后仍未能恢复缓存邮件的原文。",
      cacheWriteError: "邮件原文已读取，但无法写入本地缓存。请检查浏览器存储空间后重试。",
      start: "开始分析近两周邮件",
      resume: "继续分析近两周邮件",
      stop: "停止",
      clear: "清除本地缓存",
      needKey: "请输入有效的 Groq API Key。",
      needConsent: "请先同意将邮件正文发送给 Groq。",
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
      finished: (scanned, reused, analyzed, skipped, failed, incomplete) =>
        "完成：范围内 " + scanned + " 封，缓存复用 " + reused + " 封，新分析 " + analyzed +
        " 封，跳过 " + skipped + " 封，失败 " + failed + " 封。" + (incomplete ? "部分列表日期无法识别，统计范围可能不完整。" : ""),
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
      backContinue: "← 返回继续分析",
      previewEmail: "原文细节预览",
      previewDeadline: "截止日期原文片段",
      originalEmail: "原文邮件",
      emailUnavailable: "原文暂时无法显示，请重新运行分析以尝试恢复。",
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
      unreadNote: "首次分析前会引导你关闭 Outlook 自动标记为已读；确认一次后会记住。",
      keyStorageNote: "API Key 只保存在此浏览器的插件本地存储中，不会发送给 Mailmate，也不会进入遥测。清空此输入框即可删除已保存的 Key。"
    },
    en: {
      brand: "Mailmate Email Assistant",
      open: "Mailmate",
      language: "Display language",
      chinese: "简体中文",
      english: "English",
      intro: "Choose a language and enter your Groq API key. Click start once to scan the current folder's last two weeks; keep Outlook sorted newest first.",
      key: "Groq API key (saved in this browser's local extension storage)",
      consent: "I agree to send the email bodies in this range to Groq (US) for analysis.",
      guideEyebrow: "First-use setup",
      guideTitles: ["Open Outlook settings", "Choose Mail", "Open Mail handling", "Turn off automatic mark-as-read", "Confirm and start"],
      guideInstructions: ["Click the gear in the top-right corner of Outlook. The red frame marks it.", "In the settings sidebar, select Mail.", "In the Mail settings list, select Message handling.", "Select “Don't automatically mark email as read” and make sure it is selected.", "Confirm the option above is selected. Click below when done; Mailmate will remember this confirmation."],
      guideNote: "This prompt stays in the bottom-right and does not block Outlook. You only need to complete it once; the extension cannot inspect or change this setting for you.",
      guideStepLabel: (step, total) => `Step ${step} / ${total}`,
      guideCancel: "Cancel",
      guideBack: "Back",
      guideNext: "Next",
      guideComplete: "I finished setup; start analysis",
      guideSaveError: "Could not save the setting confirmation. Check extension storage access and try again.",
      links: "Also send visible link addresses to the model (off by default; links can be personal)",
      cache: "Save structured results, email bodies, and completion flags in this browser so analyzed emails can be skipped and originals previewed later (not sent to telemetry; API keys are not saved)",
      telemetry: "Share usage metrics and technical diagnostics with Mailmate (Cloudflare), using a random installation ID (no email body, subject, sender, API key or successful summaries/actions)",
      telemetryNote: "Anonymous usage metrics are enabled by default. Recipient display-name sharing has a separate opt-in and is off by default. Diagnostic logs are kept for 30 days; installation records are deleted after 90 days of inactivity.",
      telemetryName: "Also share a single recipient display name from email headers to distinguish users (off by default)",
      telemetryNameNote: "When enabled, only a readable recipient display name is uploaded; no email address or body is sent. Turning this off stops future uploads; saved names are deleted after 90 days of installation inactivity.",
      telemetryUnavailable: "Telemetry service is not configured; no metrics or logs are being sent.",
      telemetryChecking: "Checking the usage-statistics connection…",
      telemetryConnected: "Telemetry is connected; this opening was recorded.",
      telemetryQueued: (count) => `Telemetry is temporarily unavailable. ${count} event(s) are queued locally for retry.`,
      telemetryRejected: (status) => `The telemetry service rejected the open event (HTTP ${status}). Redeploy the updated Worker.`,
      telemetryOffline: "Telemetry is temporarily unavailable; the open event will be retried later.",
      telemetryDisabled: "Usage statistics are off; this opening was not sent.",
      telemetryIndicatorChecking: "Checking stats",
      telemetryIndicatorConnected: "Stats connected",
      telemetryIndicatorProblem: "Stats pending",
      telemetryIndicatorDisabled: "Stats off",
      processingTitle: "Summarizing your emails",
      processingNote: "The first sync may take longer depending on the number of emails to process. Keep this tab open; your summary will appear when processing is finished.",
      countingTitle: "Counting emails from the last two weeks",
      countProgress: (checked, found) => `Checked ${checked} emails; found ${found} dated within the last two weeks`,
      countEta: "The total for emails with readable list dates, analysis progress, and remaining-time estimate will appear after counting.",
      countCurrent: "Quickly scanning the email list; messages are not opened and no AI is called.",
      analyzingTitle: "Analyzing emails",
      analysisReady: "The total is counted. Analysis is starting.",
      currentEmail: (current, total) => `Analyzing email ${current} of ${total}`,
      progressCount: (done, total, analyzed, reused, failed) => `Processed ${done} / ${total} (${analyzed} newly analyzed, ${reused} from cache${failed ? `, ${failed} failed` : ""})`,
      etaCalculating: "Estimating remaining time from AI response speed…",
      etaCached: "Remaining emails can be loaded from cache without another AI request.",
      etaNoEmails: "There are no emails to analyze from the last two weeks.",
      etaRemaining: (duration) => `About ${duration} left, estimated from the average time of completed AI requests`,
      etaSeconds: (seconds) => `${seconds} sec`,
      etaMinutes: (minutes, seconds) => seconds ? `${minutes} min ${seconds} sec` : `${minutes} min`,
      countIncomplete: "The count may be incomplete; only emails with readable list dates are included.",
      retryingItem: (attempt, max) => `This email could not be processed yet. Retrying automatically (${attempt}/${max})…`,
      apologyTitle: "Sorry, this sync was interrupted",
      apologyText: "Review emails that need attention and adjust settings before trying again. Completed items are reused when local caching is enabled.",
      apologyReason: "Reason",
      apologyRetry: "Try again",
      apologySettings: "Back to settings",
      apologyIssues: (count) => `Review emails needing attention (${count})`,
      issuesButton: (count) => `Skipped / failed emails (${count})`,
      issuesTitle: "Emails needing attention",
      issueSkipped: "Skipped",
      issueFailed: "Failed",
      issueReason: "Reason",
      issueSubjectFallback: "Subject unavailable",
      issueInspectHint: "Use the subject to find and inspect the original email in Outlook.",
      missingRowsError: "Some emails were still missing from the list after rescanning. Make sure Outlook is still in the same folder and sorted newest first, then try again.",
      emailReadError: "The email body could not be read after several retries.",
      cacheBodyError: "The original email could not be restored from Outlook after several retries.",
      cacheWriteError: "The email was read, but could not be saved to local cache. Check browser storage and retry.",
      start: "Analyze emails from the last two weeks",
      resume: "Continue analysis",
      stop: "Stop",
      clear: "Clear local cache",
      needKey: "Enter a valid Groq API key.",
      needConsent: "Consent to send email bodies to Groq first.",
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
      finished: (scanned, reused, analyzed, skipped, failed, incomplete) =>
        "Done: " + scanned + " in range, " + reused + " reused, " + analyzed +
        " newly analyzed, " + skipped + " skipped, " + failed + " failed." + (incomplete ? " Some list dates were unreadable, so the range may be incomplete." : ""),
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
      backContinue: "← Back to continue analysis",
      previewEmail: "Original email preview",
      previewDeadline: "Deadline source excerpt",
      originalEmail: "Original email",
      emailUnavailable: "The original is temporarily unavailable. Run analysis again to try restoring it.",
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
      unreadNote: "The first analysis guides you through turning off Outlook automatic mark-as-read; this confirmation is remembered.",
      keyStorageNote: "The API key is stored only in this browser's local extension storage. It is not sent to Mailmate or telemetry. Clear this field to delete the saved key."
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
    ".key-storage-note{margin:-2px 0 9px;color:#818b9a;font-size:10px;line-height:1.45}",
    ".buttons{display:flex;gap:8px;margin-top:12px}",
    "button.primary,button.secondary{border:0;border-radius:8px;padding:9px 11px;font:650 12px system-ui,sans-serif;cursor:pointer}",
    "button.primary{flex:1;color:#fff;background:#2457d6}",
    "button.secondary{color:#173b76;background:#e3ebf8}",
    "button:disabled{opacity:1;color:#8992a1;background:#e8ebf1;cursor:default;box-shadow:none}",
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
    ".setup-view.is-running .intro{display:none}.setup-view.is-running .setup-controls{display:none}",
    ".processing-indicator{min-height:330px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center}.processing-indicator[hidden]{display:none!important}",
    ".processing-spinner{width:42px;height:42px;border:4px solid #e7ebf5;border-top-color:#566fe8;border-radius:50%;animation:mm-spin .85s linear infinite}",
    ".processing-title{margin-top:17px;color:#26344b;font-size:15px;font-weight:750}.processing-note{max-width:310px;margin:8px 0 20px;color:#7b8799;font-size:12px;line-height:1.6}",
    ".processing-progress{width:min(330px,94%);margin-top:24px}.processing-metrics{display:flex;justify-content:space-between;gap:10px;margin-bottom:9px;color:#536176;font-size:12px;text-align:left}.processing-count{overflow-wrap:anywhere}.processing-percent{flex:0 0 auto;color:#26344b;font-weight:750}.processing-track{width:100%;height:9px;overflow:hidden;border-radius:99px;background:#e8edf7}.processing-track span{display:block;width:34%;height:100%;border-radius:inherit;background:linear-gradient(90deg,#a7b6ff,#4665e7,#a7b6ff);animation:mm-progress 1.6s ease-in-out infinite}.processing-track:not(.is-indeterminate) span{width:0%;background:#566fe8;animation:none;transition:width .2s ease}.processing-current{min-height:18px;margin:9px 0 0;color:#566fe8;font-size:12px;font-weight:650;text-align:center}.processing-eta{min-height:18px;margin:5px 0 0;color:#7b8799;font-size:11px;line-height:1.5;text-align:center}",
    ".error-view{min-height:330px;display:grid;place-items:center;padding:24px}.error-view[hidden]{display:none}.apology-card{width:min(520px,100%);padding:24px;border:1px solid #e5e9f1;border-radius:14px;background:#fff;box-shadow:0 10px 35px #23345010}.apology-mark{width:38px;height:38px;display:grid;place-items:center;border-radius:50%;color:#a34437;background:#fff0ed;font-size:22px;font-weight:800}.apology-title{margin:14px 0 0;color:#26344b;font-size:18px}.apology-text{margin:8px 0 0;color:#68758a;font-size:12px}.apology-reason-label{margin:18px 0 5px;color:#8c98a9;font-size:10px;font-weight:700}.apology-reason{padding:10px 12px;border-radius:8px;background:#f7f8fb;color:#3e4a5d;font-size:12px;white-space:pre-wrap;overflow-wrap:anywhere}.apology-issues{margin-top:12px}.apology-actions{display:flex;gap:8px;margin-top:17px}.apology-actions button{flex:1}",
    ".processing-stop{margin-top:18px}",
    "@keyframes mm-spin{to{transform:rotate(360deg)}}@keyframes mm-progress{0%{transform:translateX(-115%)}100%{transform:translateX(310%)}}",
    ".panel{display:flex;flex-direction:column;height:auto;min-height:0;overflow:hidden}",
    ".panel.show-results{right:22px;bottom:18px;width:min(1190px,calc(100vw - 32px));height:min(700px,calc(100vh - 36px));max-height:none}",
    ".panel.is-minimized{height:68px;min-height:68px}.panel.is-minimized .content{display:none}",
    ".panel .card-header{min-height:76px;display:flex;gap:14px;padding:12px 16px}",
    ".brand-lockup{display:flex;align-items:center;gap:10px;min-width:190px}",
    ".brand-icon{width:36px;height:36px;display:grid;place-items:center;border-radius:11px;color:#fff;background:linear-gradient(145deg,#7387ff,#4f68ed 64%,#4157da);font-weight:800}",
    ".brand-name{font-size:15px;font-weight:800;color:#202b3c}.brand-caption{margin-top:3px;color:#8993a3;font-size:10px}",
    ".header-summary{display:none;flex-wrap:wrap;align-items:center;gap:7px;margin-left:auto}.panel.show-results .header-summary{display:flex}",
    ".telemetry-indicator{display:none;align-items:center;padding:4px 7px;border:1px solid #e3e8f0;border-radius:999px;color:#6e7d92;background:#f7f8fb;font-size:9px;white-space:nowrap}.telemetry-indicator.is-visible{display:inline-flex}.telemetry-indicator.ok{border-color:#cce8dc;color:#267053;background:#eff9f4}.telemetry-indicator.warn{border-color:#f0dfb7;color:#82621e;background:#fff9e9}.telemetry-indicator.off{border-color:#e3e8f0;color:#8b94a3;background:#f5f6f8}",
    ".summary-stat{padding:6px 8px;border:1px solid #edf0f5;border-radius:8px;color:#738094;background:#fff;font-size:10px;white-space:nowrap}",
    ".summary-stat strong{color:#344154;font-size:11px}",
    ".language-control{display:flex;align-items:center;gap:6px;margin:0;color:#7b8697;font-size:10px;white-space:nowrap}",
    ".language-control select{width:auto;padding:6px 8px;font-size:11px}",
    ".window-actions{display:flex;gap:4px;flex-shrink:0}",
    ".window-actions button{border:0;border-radius:7px;padding:6px 9px;color:#647187;background:#f2f4f8;font:600 11px system-ui,sans-serif;cursor:pointer}",
    ".settings-open,.issues-open,.apology-issues{border:1px solid #d4dfff;border-radius:8px;padding:8px 12px;color:#3154bd;background:#eaf0ff;font:750 11px system-ui,sans-serif;white-space:nowrap;cursor:pointer;box-shadow:0 1px 2px #324a9a12}.settings-open:hover,.issues-open:hover,.apology-issues:hover{background:#dfe8ff}",
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
    ".source-preview{position:fixed;z-index:30;width:min(430px,calc(100vw - 24px));max-height:min(520px,calc(100vh - 24px));overflow:auto;padding:14px;border:1px solid #e4e8f0;border-radius:12px;color:#354154;background:#fff;box-shadow:0 16px 46px #25345430;font:11px/1.6 system-ui,sans-serif}.source-preview[hidden]{display:none}.preview-title{color:#253248;font-size:12px;font-weight:700}.preview-meta,.preview-note{margin-top:4px;color:#8d97a6;font-size:9px}.preview-section-title{margin-top:11px;color:#59677d;font-size:10px;font-weight:750}.preview-summary{margin-top:5px;padding:9px;border-radius:7px;background:#f5f7fc;color:#26344b;font-size:11px;white-space:pre-wrap;overflow-wrap:anywhere}.preview-body{max-height:230px;overflow:auto;margin-top:5px;padding:10px;border:1px solid #e9ecf2;border-radius:7px;background:#fcfcfd;white-space:pre-wrap;overflow-wrap:anywhere}.preview-body mark{background:#fff0bd;color:#725016}.issue-list{display:grid;gap:9px}.issue-item{padding:10px;border:1px solid #e8ebf1;border-radius:8px;background:#fff}.issue-heading{display:flex;align-items:flex-start;gap:7px}.issue-kind{flex:0 0 auto;padding:2px 6px;border-radius:99px;background:#fff4db;color:#845d16;font-size:9px;font-weight:700}.issue-kind.failed{background:#ffefed;color:#a54033}.issue-subject{color:#2e3b50;font-size:11px;font-weight:700;overflow-wrap:anywhere}.issue-meta{margin:4px 0 0;color:#8c97a8;font-size:9px}.issue-reason{margin:6px 0 0;color:#566377;font-size:10px;overflow-wrap:anywhere}",
    ".modal-layer{position:fixed;z-index:40;inset:0;display:grid;place-items:center;padding:24px;background:#15213b66}.modal-layer[hidden]{display:none}.message-modal{width:min(780px,calc(100vw - 32px));max-height:min(80vh,760px);display:flex;flex-direction:column;overflow:hidden;border:1px solid #e5e8f0;border-radius:14px;background:#fff;box-shadow:0 24px 70px #111b33a0}.modal-header{display:flex;justify-content:space-between;gap:12px;padding:16px 18px;border-bottom:1px solid #edf0f5}.modal-title{font-size:14px;font-weight:700}.modal-meta{margin-top:4px;color:#8490a0;font-size:10px}.modal-body{overflow:auto;padding:18px;color:#354154;font-size:12px;line-height:1.7;white-space:pre-wrap;overflow-wrap:anywhere}.modal-close{border:0;background:transparent;font-size:22px;cursor:pointer}.modal-footer{padding:10px 18px;border-top:1px solid #edf0f5;color:#929cab;font-size:10px}",
    ".unread-guide-layer{position:fixed;z-index:2147483647;inset:0;font:14px/1.5 system-ui,sans-serif;pointer-events:none}.unread-guide-layer[hidden]{display:none!important}.guide-shield{position:fixed;z-index:0;background:#0d172c99;pointer-events:auto;cursor:default}.guide-live-ring{position:fixed;z-index:1;border:3px solid #f02f34;border-radius:7px;box-shadow:0 0 0 5px #fff9,0 0 24px 8px #ff263b99;pointer-events:none;animation:mm-guide-pulse 1.05s ease-in-out infinite}.guide-live-ring[hidden]{display:none}.unread-guide{position:fixed;z-index:2;right:24px;bottom:22px;width:min(510px,calc(100vw - 32px));max-height:min(88vh,760px);overflow:auto;padding:19px;border:1px solid #e2e7f0;border-radius:16px;background:#fff;box-shadow:0 24px 80px #07152b66;pointer-events:auto}.guide-heading{display:flex;align-items:center;justify-content:space-between;gap:12px}.guide-eyebrow{margin:0;color:#5769d9;font-size:11px;font-weight:800;letter-spacing:.04em}.guide-counter{color:#8691a3;font-size:10px;font-weight:650;white-space:nowrap}.guide-title{margin:7px 0 0;color:#243149;font-size:19px;line-height:1.3}.guide-intro{min-height:36px;margin:8px 0 12px;color:#637086;font-size:12px}.guide-image-stage{height:clamp(135px,25vh,210px);display:flex;align-items:center;justify-content:center;overflow:hidden;border:1px solid #e7ebf2;border-radius:10px;background:#f6f8fc}.guide-image-wrap{position:relative;display:flex;max-width:100%;max-height:100%;align-items:center;justify-content:center}.guide-image{display:block;max-width:100%;max-height:100%;object-fit:contain}.guide-preview-highlight{position:absolute;border:3px solid #ed252d;border-radius:4px;box-shadow:0 0 0 3px #fff9,0 0 19px 6px #ff263b99;animation:mm-guide-pulse 1.05s ease-in-out infinite;pointer-events:none}.guide-image-stage[data-kind=gear] .guide-preview-highlight{left:93.1%;top:0;width:4.2%;height:44%}.guide-image-stage[data-kind=mail] .guide-preview-highlight{left:.25%;top:13.3%;width:18%;height:4.4%}.guide-image-stage[data-kind=handling] .guide-preview-highlight{left:15.8%;top:42.2%;width:17.3%;height:8%}.guide-image-stage[data-kind=read-state] .guide-preview-highlight{left:33.2%;top:16.5%;width:34.6%;height:16.9%}.guide-note{margin-top:12px;padding:9px 11px;border-left:3px solid #e1a839;border-radius:5px;background:#fff8e7;color:#73571e;font-size:11px}.guide-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}.guide-actions button{min-height:40px}.guide-actions .guide-start{flex:0 1 auto}.guide-actions button:disabled,.guide-actions .primary:disabled{color:#8992a1;background:#e8ebf1;cursor:default;opacity:1}@keyframes mm-guide-pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.045);opacity:.72}}@media(prefers-reduced-motion:reduce){.guide-live-ring,.guide-preview-highlight{animation:none}}@media(max-width:600px){.unread-guide{right:8px;bottom:8px;width:calc(100vw - 16px);padding:15px}.guide-image-stage{height:150px}.guide-title{font-size:17px}}",
    "@media(max-width:720px){.panel.show-results{right:8px;bottom:8px;width:calc(100vw - 16px);height:calc(100vh - 16px)}.panel .card-header{gap:7px;padding:10px}.brand-lockup{min-width:0}.header-summary{display:none}.language-control span{display:none}.content{padding:0 9px 8px}.toolbar{gap:6px}.sort-note{display:none}.search-box{width:100%;max-width:none}.results-table{min-width:1060px}}"
  ].join("\n");

  const host = document.createElement("div");
  host.id = HOST_ID;
  const shadow = host.attachShadow({ mode: "closed" });
  document.documentElement.append(host);
  const style = document.createElement("style");
  style.textContent = styles + "\n" + [
    ".unread-guide-layer{position:fixed;z-index:2147483647;inset:auto 22px 22px auto;display:block;width:min(510px,calc(100vw - 32px));padding:0;background:transparent;pointer-events:none}",
    ".unread-guide-layer[hidden]{display:none!important}.guide-shield,.guide-live-ring{display:none!important}",
    ".unread-guide{position:relative;right:auto;bottom:auto;width:100%;max-height:min(88vh,760px);pointer-events:auto}",
    "@media(max-width:600px){.unread-guide-layer{inset:auto 8px 8px auto;width:calc(100vw - 16px)}.unread-guide{right:auto;bottom:auto;width:100%;padding:15px}}"
  ].join("\n");
  const root = document.createElement("div");
  root.innerHTML = [
    '<button class="launcher" type="button"></button>',
    '<section class="panel" hidden>',
    ' <header class="card-header">',
    '  <div class="brand-lockup"><div class="brand-icon">M</div><div><div class="brand-name"></div><div class="brand-caption"></div></div></div>',
    '  <div class="header-summary"></div><span class="telemetry-indicator" role="status" aria-live="polite"></span>',
    '  <label class="language-control"><span class="language-label"></span><select class="language"><option value="zh"></option><option value="en"></option></select></label>',
    '  <div class="window-actions"><button class="minimize" type="button" aria-label="Minimize">−</button><button class="close" type="button" aria-label="Close">×</button></div>',
    ' </header>',
    ' <div class="content">',
    '  <section class="setup-view">',
    '  <p class="hint intro"></p>',
    '  <div class="setup-controls">',
    '  <label class="key-label"></label><input class="api-key" type="password" autocomplete="off" spellcheck="false"><p class="key-storage-note"></p>',
    '  <label class="check"><input class="consent" type="checkbox"><span class="consent-text"></span></label>',
    '  <label class="check"><input class="send-links" type="checkbox"><span class="links-text"></span></label>',
    '  <label class="check"><input class="cache-enabled" type="checkbox" checked><span class="cache-text"></span></label>',
    '  <label class="check"><input class="telemetry-enabled" type="checkbox" checked><span class="telemetry-text"></span></label>',
    '  <p class="hint telemetry-note"></p>',
    '  <label class="check"><input class="telemetry-name-enabled" type="checkbox"><span class="telemetry-name-text"></span></label>',
    '  <p class="hint telemetry-name-note"></p>',
    '  <div class="buttons"><button class="primary start" type="button"></button><button class="secondary stop" type="button" disabled></button><button class="secondary clear" type="button"></button></div>',
    '  <p class="status" aria-live="polite"></p>',
    '  <p class="foot unread-note"></p>',
    '  </div>',
    '  <div class="processing-indicator" hidden aria-live="polite"><div class="processing-spinner" aria-hidden="true"></div><div class="processing-title"></div><p class="processing-note"></p><div class="processing-progress"><div class="processing-metrics"><span class="processing-count"></span><span class="processing-percent"></span></div><div class="processing-track is-indeterminate"><span></span></div><p class="processing-current"></p><p class="processing-eta"></p></div><button class="secondary processing-stop" type="button"></button></div>',
    '  </section>',
    '  <section class="error-view" hidden><div class="apology-card"><div class="apology-mark" aria-hidden="true">!</div><h2 class="apology-title"></h2><p class="apology-text"></p><p class="apology-reason-label"></p><div class="apology-reason"></div><button class="apology-issues" type="button" hidden></button><div class="apology-actions"><button class="secondary apology-settings" type="button"></button><button class="primary apology-retry" type="button"></button></div></div></section>',
    '  <section class="results-view" hidden>',
    '   <p class="result-status" aria-live="polite"></p>',
    '   <div class="toolbar">',
    '    <label class="search-box"><span aria-hidden="true">⌕</span><input class="search-input" type="search" autocomplete="off"></label>',
    '    <div class="filter-group" role="group"><button class="filter-button active" data-filter="all" type="button"></button><button class="filter-button" data-filter="pending" type="button"></button><button class="filter-button" data-filter="completed" type="button"></button></div>',
    '    <button class="issues-open" type="button" hidden></button><span class="sort-note"></span><button class="settings-open" type="button"></button>',
    '   </div>',
    '   <div class="table-frame"><table class="results-table"><colgroup><col class="col-importance"><col class="col-category"><col class="col-summary"><col class="col-normalized"><col class="col-raw"><col class="col-action"><col class="col-completed"></colgroup><thead><tr><th></th><th></th><th></th><th></th><th></th><th></th><th></th></tr></thead><tbody class="result-rows"></tbody></table><div class="empty-state" hidden><strong></strong><span></span></div></div>',
    '   <footer class="results-footer"><span class="result-footer-left"></span><span class="result-footer-right"></span></footer>',
    '  </section>',
    '  <div class="source-preview" role="tooltip" hidden></div>',
    '  <div class="modal-layer" hidden><section class="message-modal" role="dialog" aria-modal="true"><header class="modal-header"><div><div class="modal-title"></div><div class="modal-meta"></div></div><button class="modal-close" type="button" aria-label="Close">×</button></header><div class="modal-body"></div><footer class="modal-footer"></footer></section></div>',
    ' </div>',
    '</section>',
    '<div class="unread-guide-layer" hidden><section class="unread-guide" role="dialog" aria-labelledby="unread-guide-title"><div class="guide-heading"><p class="guide-eyebrow"></p><span class="guide-counter"></span></div><h2 class="guide-title" id="unread-guide-title"></h2><p class="guide-intro"></p><div class="guide-image-stage"><div class="guide-image-wrap"><img class="guide-image" alt=""><span class="guide-preview-highlight" aria-hidden="true"></span></div></div><p class="guide-note"></p><div class="guide-actions"><button class="secondary guide-cancel" type="button"></button><button class="secondary guide-back" type="button" disabled></button><button class="primary guide-start" type="button"></button></div></section></div>'
  ].join("");
  shadow.append(style, root);

  const $ = (selector) => root.querySelector(selector);
  const launcher = $(".launcher");
  const panel = $(".panel");
  const languageSelect = $(".language");
  const setupView = $(".setup-view");
  const errorView = $(".error-view");
  const resultsView = $(".results-view");
  const resultRows = $(".result-rows");
  const searchInput = $(".search-input");
  const emptyState = $(".empty-state");
  const headerSummary = $(".header-summary");
  const resultStatusNode = $(".result-status");
  const filterButtons = [...root.querySelectorAll(".filter-button")];
  const keyInput = $(".api-key");
  const consentInput = $(".consent");
  const unreadGuideLayer = $(".unread-guide-layer");
  const unreadGuideStart = $(".guide-start");
  const unreadGuideBack = $(".guide-back");
  const linksInput = $(".send-links");
  const cacheInput = $(".cache-enabled");
  const telemetryInput = $(".telemetry-enabled");
  const telemetryNameInput = $(".telemetry-name-enabled");
  const startButton = $(".start");
  const stopButton = $(".stop");
  const clearButton = $(".clear");
  const statusNode = $(".status");
  const processingTitleNode = $(".processing-title");
  const processingCountNode = $(".processing-count");
  const processingPercentNode = $(".processing-percent");
  const processingTrackNode = $(".processing-track");
  const processingFillNode = $(".processing-track span");
  const processingCurrentNode = $(".processing-current");
  const processingEtaNode = $(".processing-eta");
  let language = (navigator.language || "en").toLowerCase().startsWith("zh") ? "zh" : "en";
  let running = false;
  let stopRequested = false;
  let persistentCache = {};
  let currentRecords = new Map();
  let hasScanned = false;
  let currentFilter = "all";
  let hoverTimer = 0;
  let activePreviewTrigger = null;
  let lastRequestAt = 0;
  let tokenWindow = [];
  let providerRemainingTokens = null;
  let providerTokenResetAt = 0;
  let promptOverheadEstimate = 500;
  const promptOverheadSamples = [];
  let currentProgress = null;
  let batchIssues = [];
  let terminalErrorMessage = "";
  let preservePartialResults = false;
  let apiKeySaveTimer = 0;
  let telemetryCheckResult = null;
  let lastRecipientDisplayName = null;
  let unreadGuideStage = -1;

  const guideImageUrls = {
    gear: chrome.runtime.getURL("assets/outlook-settings-gear.jpg"),
    mail: chrome.runtime.getURL("assets/outlook-mail-handling.jpg")
  };

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
    $(".key-storage-note").textContent = t.keyStorageNote;
    $(".consent-text").textContent = t.consent;
    $(".guide-eyebrow").textContent = t.guideEyebrow;
    $(".guide-note").textContent = t.guideNote;
    $(".guide-cancel").textContent = t.guideCancel;
    unreadGuideBack.textContent = t.guideBack;
    $(".links-text").textContent = t.links;
    $(".cache-text").textContent = t.cache;
    $(".telemetry-text").textContent = t.telemetry;
    $(".telemetry-name-text").textContent = t.telemetryName;
    $(".telemetry-name-note").textContent = t.telemetryNameNote;
    updateTelemetryNameControl();
    renderTelemetryNote();
    telemetryInput.disabled = running;
    $(".processing-title").textContent = t.processingTitle;
    $(".processing-note").textContent = t.processingNote;
    if (currentProgress) updateProcessingProgress(currentProgress);
    $(".processing-stop").textContent = t.stop;
    startButton.textContent = hasScanned ? t.resume : t.start;
    stopButton.textContent = t.stop;
    clearButton.textContent = t.clear;
    $(".unread-note").textContent = t.unreadNote;
    if (unreadGuideStage >= 0) renderUnreadGuideStage();
    searchInput.placeholder = t.search;
    const headings = root.querySelectorAll(".results-table thead th");
    t.columns.forEach((label, index) => { headings[index].textContent = label; });
    $(".sort-note").textContent = t.sort;
    $(".settings-open").textContent = t.backContinue;
    $(".apology-title").textContent = t.apologyTitle;
    $(".apology-text").textContent = t.apologyText;
    $(".apology-reason-label").textContent = t.apologyReason;
    $(".apology-settings").textContent = t.apologySettings;
    $(".apology-retry").textContent = t.apologyRetry;
    updateIssueButtons();
    $(".empty-state strong").textContent = t.noMatches;
    $(".empty-state span").textContent = t.searchHint;
    $(".modal-close").setAttribute("aria-label", language === "zh" ? "关闭" : "Close");
    renderRecords();
  }

  function showUnreadGuide() {
    unreadGuideLayer.hidden = false;
    setUnreadGuideStage(0);
    $(".guide-cancel").focus();
  }

  function closeUnreadGuide() {
    unreadGuideLayer.hidden = true;
    unreadGuideStage = -1;
  }

  function setUnreadGuideStage(stage) {
    unreadGuideStage = Math.max(0, Math.min(4, stage));
    renderUnreadGuideStage();
  }

  function renderUnreadGuideStage() {
    if (unreadGuideStage < 0) return;
    const t = strings[language];
    const titles = t.guideTitles;
    const instructions = t.guideInstructions;
    $(".guide-eyebrow").textContent = t.guideEyebrow;
    $(".guide-counter").textContent = t.guideStepLabel(unreadGuideStage + 1, 5);
    $(".guide-title").textContent = titles[unreadGuideStage];
    $(".guide-intro").textContent = instructions[unreadGuideStage];
    $(".guide-note").textContent = t.guideNote;
    unreadGuideBack.disabled = unreadGuideStage === 0;
    unreadGuideStart.textContent = unreadGuideStage === 4 ? t.guideComplete : t.guideNext;
    const stage = $(".guide-image-stage");
    const image = $(".guide-image");
    if (unreadGuideStage === 0) {
      stage.dataset.kind = "gear";
      image.src = guideImageUrls.gear;
      image.alt = language === "zh" ? "Outlook 右上角设置齿轮，红框闪烁提示位置" : "Outlook settings gear in the top-right corner, highlighted in red";
    } else {
      stage.dataset.kind = unreadGuideStage === 1 ? "mail" : unreadGuideStage === 2 ? "handling" : "read-state";
      image.src = guideImageUrls.mail;
      image.alt = language === "zh" ? "Outlook 邮件处理设置路径，红框闪烁提示位置" : "Outlook Mail handling settings path, highlighted in red";
    }
  }

  function persistApiKeySoon() {
    window.clearTimeout(apiKeySaveTimer);
    apiKeySaveTimer = window.setTimeout(() => { void persistApiKeyNow(); }, 350);
  }

  async function persistApiKeyNow() {
    window.clearTimeout(apiKeySaveTimer);
    const apiKey = keyInput.value.trim();
    try {
      if (apiKey) await chrome.storage.local.set({ [API_KEY_KEY]: apiKey });
      else await chrome.storage.local.remove(API_KEY_KEY);
    } catch { /* Keep the current run usable even when browser storage is unavailable. */ }
  }

  function renderTelemetryNote() {
    const t = strings[language];
    const result = telemetryCheckResult;
    let note = "";
    let label = "";
    let tone = "";
    if (!result) {
      note = TELEMETRY_ENDPOINT ? t.telemetryNote : t.telemetryUnavailable;
    } else if (result.checking) {
      note = t.telemetryChecking;
      label = t.telemetryIndicatorChecking;
      tone = "warn";
    } else if (!result.configured) {
      note = t.telemetryUnavailable;
      label = t.telemetryIndicatorProblem;
      tone = "warn";
    } else if (!result.enabled) {
      note = t.telemetryDisabled;
      label = t.telemetryIndicatorDisabled;
      tone = "off";
    } else if (result.eventRejected) {
      note = t.telemetryRejected(result.eventStatus || 400);
      label = t.telemetryIndicatorProblem;
      tone = "warn";
    } else if (result.workerAvailable && result.eventSent) {
      note = t.telemetryConnected;
      label = t.telemetryIndicatorConnected;
      tone = "ok";
    } else if (result.pendingEvents > 0) {
      note = t.telemetryQueued(result.pendingEvents);
      label = t.telemetryIndicatorProblem;
      tone = "warn";
    } else {
      note = t.telemetryOffline;
      label = t.telemetryIndicatorProblem;
      tone = "warn";
    }
    $(".telemetry-note").textContent = note;
    const indicator = $(".telemetry-indicator");
    indicator.textContent = label;
    indicator.title = note;
    indicator.className = "telemetry-indicator" + (label ? ` is-visible ${tone}` : "");
  }

  function updateTelemetryNameControl() {
    telemetryNameInput.disabled = running || !telemetryInput.checked;
  }

  async function checkTelemetryOnOpen() {
    if (!TELEMETRY_ENDPOINT) {
      telemetryCheckResult = { configured: false };
      renderTelemetryNote();
      return;
    }
    telemetryCheckResult = { checking: true };
    renderTelemetryNote();
    try {
      const currentEmail = telemetryNameInput.checked ? extractCurrentEmail() : null;
      telemetryCheckResult = await chrome.runtime.sendMessage({
        type: "MAILMATE_TELEMETRY_CHECK",
        payload: {
          language,
          ...(currentEmail?.recipient_display_name ? { display_name: currentEmail.recipient_display_name } : {})
        }
      });
    } catch {
      telemetryCheckResult = { configured: Boolean(TELEMETRY_ENDPOINT), enabled: true, workerAvailable: false, pendingEvents: 0 };
    }
    renderTelemetryNote();
  }

  function showSettingsView() {
    setupView.hidden = false;
    resultsView.hidden = true;
    errorView.hidden = true;
    panel.classList.remove("show-results");
  }

  function showResultsView() {
    setupView.hidden = true;
    errorView.hidden = true;
    resultsView.hidden = false;
    panel.classList.add("show-results");
  }

  function showFailureView(message) {
    setupView.hidden = true;
    resultsView.hidden = true;
    errorView.hidden = false;
    panel.classList.remove("show-results");
    terminalErrorMessage = message || strings[language].missingRowsError;
    $(".apology-reason").textContent = terminalErrorMessage;
    $(".apology-issues").textContent = strings[language].apologyIssues(batchIssues.length);
    $(".apology-issues").hidden = batchIssues.length === 0;
  }

  function setStatus(message, kind) {
    const visibleMessage = running ? "" : (message || "");
    statusNode.textContent = visibleMessage;
    statusNode.className = "status" + (kind && !running ? " " + kind : "");
    if (resultStatusNode) {
      resultStatusNode.textContent = visibleMessage;
      resultStatusNode.className = "result-status" + (kind && !running ? " " + kind : "");
    }
  }

  function formatEstimateDuration(milliseconds) {
    const totalSeconds = Math.max(1, Math.ceil(milliseconds / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return minutes ? strings[language].etaMinutes(minutes, seconds) : strings[language].etaSeconds(seconds);
  }

  function updateProcessingProgress(progress) {
    currentProgress = { ...progress };
    const t = strings[language];
    if (progress.phase === "counting") {
      processingTitleNode.textContent = t.countingTitle;
      processingCountNode.textContent = t.countProgress(progress.checked || 0, progress.found || 0);
      processingPercentNode.textContent = "";
      processingTrackNode.classList.add("is-indeterminate");
      processingTrackNode.removeAttribute("role");
      processingTrackNode.removeAttribute("aria-valuenow");
      processingTrackNode.removeAttribute("aria-valuemin");
      processingTrackNode.removeAttribute("aria-valuemax");
      processingFillNode.style.width = "";
      processingCurrentNode.textContent = t.countCurrent;
      processingEtaNode.textContent = progress.incomplete ? t.countIncomplete : t.countEta;
      return;
    }

    const total = Math.max(0, Number(progress.total) || 0);
    const done = Math.max(0, Math.min(total, Number(progress.done) || 0));
    const percent = total ? done / total * 100 : 100;
    processingTitleNode.textContent = t.analyzingTitle;
    $(".processing-note").textContent = progress.countIncomplete ? t.countIncomplete : t.processingNote;
    processingCountNode.textContent = t.progressCount(done, total, progress.analyzed || 0, progress.reused || 0, progress.failed || 0);
    processingPercentNode.textContent = `${percent.toFixed(1)}%`;
    processingTrackNode.classList.remove("is-indeterminate");
    processingTrackNode.setAttribute("role", "progressbar");
    processingTrackNode.setAttribute("aria-valuemin", "0");
    processingTrackNode.setAttribute("aria-valuemax", "100");
    processingTrackNode.setAttribute("aria-valuenow", percent.toFixed(1));
    processingFillNode.style.width = `${percent}%`;
    processingCurrentNode.textContent = progress.currentPosition && progress.done < total
      ? t.currentEmail(progress.currentPosition, total)
      : (progress.done < total ? t.analysisReady : "");

    if (!total) processingEtaNode.textContent = t.etaNoEmails;
    else if (progress.done >= total) processingEtaNode.textContent = "";
    else if (!(progress.pendingAi > 0)) processingEtaNode.textContent = t.etaCached;
    else if (!(progress.averageMs > 0)) processingEtaNode.textContent = t.etaCalculating;
    else processingEtaNode.textContent = t.etaRemaining(formatEstimateDuration(progress.averageMs * progress.pendingAi));
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

  function extractRecipientDisplayName(main, bodyElement, subject) {
    const recipientNode = main.querySelector('[data-testid*="recipient" i],[aria-label*="recipient" i],[aria-label*="收件人"],[data-testid*="收件人"]');
    let raw = recipientNode && visible(recipientNode)
      ? normalizedText(recipientNode.innerText || recipientNode.getAttribute("aria-label") || "")
      : "";

    if (!raw) {
      const mainText = clean(main.innerText || "");
      const bodyText = clean(bodyElement?.innerText || "");
      const bodyStart = bodyText ? mainText.lastIndexOf(bodyText) : -1;
      const foundSubjectStart = subject ? mainText.lastIndexOf(subject) : -1;
      const subjectStart = foundSubjectStart >= 0 && (bodyStart < 0 || foundSubjectStart < bodyStart) ? foundSubjectStart : -1;
      const headerStart = subjectStart >= 0 ? subjectStart : Math.max(0, bodyStart >= 0 ? bodyStart - 2400 : 0);
      const headerEnd = bodyStart >= 0 ? bodyStart : Math.min(mainText.length, headerStart + 2400);
      const lines = mainText.slice(headerStart, headerEnd).split("\n").map((line) => line.trim()).filter(Boolean);
      const labelIndex = lines.findIndex((line) => /^(?:收件人|收件者|to|recipients?)\s*[:：]/i.test(line));
      if (labelIndex >= 0) {
        raw = lines[labelIndex].replace(/^(?:收件人|收件者|to|recipients?)\s*[:：]\s*/i, "").trim();
        if (!raw) raw = lines[labelIndex + 1] || "";
      }
    }

    if (!raw || /[,;，；、]|\s+(?:and|&|和)\s+/i.test(raw)) return null;
    let name = raw
      .replace(/^(?:收件人|收件者|to|recipients?)\s*[:：]\s*/i, "")
      .replace(/<[^>]*>/g, " ")
      .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, " ")
      .replace(/https?:\/\/\S+/gi, " ")
      .replace(/[^\p{L}\p{M}\p{N}\s.'’()-]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (name.length < 2 || name.length > 80 || /@|https?:/i.test(name)) return null;
    return name;
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
    const recipientDisplayName = extractRecipientDisplayName(main, selected.element, subject);
    lastRecipientDisplayName = recipientDisplayName;
    return {
      subject: subject || "(subject not identified)",
      sender: sender || "(sender not identified)",
      recipient_display_name: recipientDisplayName,
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
    // Keep the same 12s safety window while checking more often so Outlook's
    // message pane can be detected sooner after a row click.
    for (let attempt = 0; attempt < 100; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 120));
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

  function estimateTextTokens(value) {
    let cjk = 0;
    let other = 0;
    for (const character of String(value || "")) {
      if (/[\u3400-\u9fff\uf900-\ufaff]/u.test(character)) cjk++;
      else other++;
    }
    return cjk * 1.05 + other / 3.8;
  }

  function estimateTokens(email) {
    const metadata = { ...email };
    delete metadata.body_text;
    const requestContentEstimate = estimateTextTokens(email.body_text) + estimateTextTokens(JSON.stringify(metadata));
    return Math.ceil(requestContentEstimate + promptOverheadEstimate + 250);
  }

  function updateTokenBudget(rateLimits) {
    const providerLimit = Number(rateLimits?.tokenLimit);
    if (Number.isFinite(providerLimit) && providerLimit > 0) {
      // Keep a small reserve for tokenizer variance and account-wide requests from other apps.
      tokenBudgetPerMinute = Math.max(300, Math.floor(providerLimit * 0.95));
    }
    const remaining = rateLimits?.remainingTokens == null ? Number.NaN : Number(rateLimits.remainingTokens);
    if (Number.isFinite(remaining) && remaining >= 0) providerRemainingTokens = remaining;
    const resetSeconds = rateLimits?.tokenResetSeconds == null ? Number.NaN : Number(rateLimits.tokenResetSeconds);
    providerTokenResetAt = Number.isFinite(resetSeconds) && resetSeconds > 0
      ? Date.now() + resetSeconds * 1000 + 100
      : 0;
  }

  function calibrateTokenEstimate(email, usage) {
    const promptTokens = Number(usage?.prompt_tokens);
    if (!Number.isFinite(promptTokens) || promptTokens <= 0) return;
    const metadata = { ...email };
    delete metadata.body_text;
    const contentEstimate = estimateTextTokens(email.body_text) + estimateTextTokens(JSON.stringify(metadata));
    const overhead = promptTokens - contentEstimate;
    if (overhead < 200 || overhead > 1800) return;
    promptOverheadSamples.push(overhead);
    if (promptOverheadSamples.length > 12) promptOverheadSamples.shift();
    const sorted = [...promptOverheadSamples].sort((a, b) => a - b);
    const upperQuartile = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.75))];
    promptOverheadEstimate = Math.max(350, Math.min(1000, Math.ceil(upperQuartile)));
  }

  function fitBodyToTokenBudget(email, budget) {
    if (estimateTokens(email) <= budget) return false;
    const original = String(email.body_text || "");
    const characters = Array.from(original);
    if (characters.length <= 1200) return false;
    let low = 1200;
    let high = characters.length - 1;
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      email.body_text = clipBodyForRetry(original, middle);
      if (estimateTokens(email) <= budget) low = middle;
      else high = middle - 1;
    }
    email.body_text = clipBodyForRetry(original, low);
    return true;
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
      const tpmWait = used + estimate > tokenBudgetPerMinute && tokenWindow.length
        ? Math.max(0, tokenWindow[0].at + 60000 - now + 100)
        : 0;
      const providerWait = providerRemainingTokens !== null && estimate > providerRemainingTokens && providerTokenResetAt > now
        ? providerTokenResetAt - now
        : 0;
      const wait = Math.max(rpmWait, tpmWait, providerWait);
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
      body_text: String(record.body_text || ""),
      usage: record.usage || null
    };
  }

  async function saveRecord(record) {
    if (!cacheInput.checked) return false;
    persistentCache[record.cache_key] = storedRecord(record);
    const entries = Object.entries(persistentCache)
      .sort((a, b) => a[0] === record.cache_key ? -1 : b[0] === record.cache_key ? 1 : (b[1].received_epoch || 0) - (a[1].received_epoch || 0))
      .slice(0, MAX_CACHE_RECORDS);
    while (entries.length && new TextEncoder().encode(JSON.stringify(Object.fromEntries(entries))).length > MAX_CACHE_BYTES) entries.pop();
    persistentCache = Object.fromEntries(entries);
    if (!Object.hasOwn(persistentCache, record.cache_key)) return false;
    try {
      await chrome.storage.local.set({ [CACHE_KEY]: persistentCache });
      return true;
    } catch {
      setStatus(strings[language].cacheError, "error");
      return false;
    }
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
    const bodyText = String(stored.body_text || "").trim();
    if (bodyText.length < 20) return false;
    const cached = { ...stored, cache_key: cacheKey, body_text: bodyText };
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

  function updateIssueButtons() {
    const t = strings[language];
    const openButton = $(".issues-open");
    openButton.textContent = t.issuesButton(batchIssues.length);
    openButton.hidden = batchIssues.length === 0;
    const apologyButton = $(".apology-issues");
    apologyButton.textContent = t.apologyIssues(batchIssues.length);
    apologyButton.hidden = batchIssues.length === 0;
  }

  function addBatchIssue(kind, descriptor, reason, stage, email = null) {
    const identity = descriptor?.stableId || descriptor?.key || descriptor?.subject || email?.subject || "unknown";
    const issueId = `${kind}:${stage || "batch"}:${identity}`;
    if (batchIssues.some((item) => item.id === issueId)) return;
    batchIssues.push({
      id: issueId,
      kind,
      subject: email?.subject || descriptor?.subject || strings[language].issueSubjectFallback,
      sender: email?.sender || "",
      received: email?.received_at || descriptor?.receivedRaw || (descriptor?.receivedDate ? formatLocalDate(descriptor.receivedDate) : ""),
      reason: String(reason || "")
    });
    updateIssueButtons();
  }

  function showIssuesModal() {
    const t = strings[language];
    const modal = $(".modal-layer");
    $(".modal-title").textContent = t.issuesTitle;
    $(".message-modal .modal-meta").textContent = `${batchIssues.length}`;
    const body = $(".modal-body");
    const list = makeText("div", "issue-list", "");
    for (const issue of batchIssues) {
      const item = makeText("article", "issue-item", "");
      const heading = makeText("div", "issue-heading", "");
      heading.append(makeText("span", "issue-kind" + (issue.kind === "failed" ? " failed" : ""), issue.kind === "failed" ? t.issueFailed : t.issueSkipped));
      heading.append(makeText("strong", "issue-subject", issue.subject));
      item.append(heading);
      const meta = [issue.sender, issue.received].filter(Boolean).join(" · ");
      if (meta) item.append(makeText("p", "issue-meta", meta));
      if (issue.reason) {
        const reason = makeText("p", "issue-reason", "");
        reason.append(makeText("b", "", `${t.issueReason}：`), document.createTextNode(issue.reason));
        item.append(reason);
      }
      list.append(item);
    }
    body.replaceChildren(list);
    $(".modal-footer").textContent = t.issueInspectHint;
    $(".source-preview").hidden = true;
    modal.hidden = false;
    $(".modal-close").focus();
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
    preview.append(makeText("div", "preview-title", kind === "deadline" ? t.previewDeadline : t.previewEmail));
    preview.append(makeText("div", "modal-meta", record.subject || localizedSummary(record.analysis || {})));
    preview.append(makeText("div", "preview-meta", [record.sender, record.received_at].filter(Boolean).join(" · ")));
    const bodyText = String(record.body_text || "");
    const body = makeText("div", "preview-body", "");
    if (kind === "email") {
      preview.append(makeText("div", "preview-section-title", t.summary));
      preview.append(makeText("div", "preview-summary", localizedSummary(record.analysis || {}) || record.subject || ""));
      preview.append(makeText("div", "preview-section-title", t.originalEmail));
      body.textContent = bodyText || t.emailUnavailable;
    } else if (!bodyText) {
      body.textContent = t.emailUnavailable;
    } else if (deadline.raw_text) {
      const index = bodyText.toLocaleLowerCase().indexOf(String(deadline.raw_text).toLocaleLowerCase());
      const start = index < 0 ? 0 : Math.max(0, index - 180);
      const excerpt = bodyText.slice(start, index < 0 ? 520 : Math.min(bodyText.length, index + deadline.raw_text.length + 260));
      const matchIndex = index < 0 ? -1 : index - start;
      if (matchIndex >= 0) {
        body.append(document.createTextNode(excerpt.slice(0, matchIndex)));
        const mark = makeText("mark", "", deadline.raw_text);
        body.append(mark, document.createTextNode(excerpt.slice(matchIndex + deadline.raw_text.length)));
      } else body.textContent = excerpt;
    } else body.textContent = bodyText;
    preview.append(body, makeText("div", "preview-note", t.originalOnly));
    const rect = trigger.getBoundingClientRect();
    preview.hidden = false;
    activePreviewTrigger = trigger;
    const width = Math.min(430, window.innerWidth - 24);
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
      emitTelemetry("task_snapshot", currentTaskSnapshot());
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
    updateIssueButtons();
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
      subject: email.subject,
      sender: email.sender,
      body_text: email.body_text,
      links: linksInput.checked
        ? email.links.slice(0, 5).map((link) => ({ label: link.label.slice(0, 180), url: link.url.slice(0, 512) }))
        : []
    };
    let response = null;
    let sizeRetries = 0;
    let quotaRetried = false;
    let truncatedForProvider = false;
    while (true) {
      if (!truncatedForProvider && fitBodyToTokenBudget(payloadEmail, tokenBudgetPerMinute)) {
        truncatedForProvider = true;
        setStatus(strings[language].payloadRetry(payloadEmail.body_text.length));
      }
      const estimate = estimateTokens(payloadEmail);
      await waitForProviderCapacity(estimate);
      if (stopRequested) return { stopped: true };
      const requestStartedAt = Date.now();
      lastRequestAt = requestStartedAt;
      response = await chrome.runtime.sendMessage({
        type: "MAILMATE_ANALYZE_CURRENT_EMAIL",
        payload: {
          apiKey,
          language,
          email: payloadEmail,
          ...(telemetryNameInput.checked && email.recipient_display_name ? { display_name: email.recipient_display_name } : {})
        }
      });
      updateTokenBudget(response?.rateLimits);

      if (response?.ok) {
        calibrateTokenEstimate(payloadEmail, response.usage);
        tokenWindow.push({ at: requestStartedAt, tokens: Number(response.usage?.total_tokens || estimate) });
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
    if (cacheInput.checked && !(await saveRecordWithRetries(record))) {
      throw Object.assign(new Error(strings[language].cacheWriteError), { stage: "cache_write" });
    }
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
    setupView.classList.toggle("is-running", isBusy);
    $(".processing-indicator").hidden = !isBusy;
    statusNode.hidden = isBusy;
    startButton.disabled = isBusy;
    stopButton.disabled = !isBusy;
    languageSelect.disabled = isBusy;
    keyInput.disabled = isBusy;
    consentInput.disabled = isBusy;
    linksInput.disabled = isBusy;
    cacheInput.disabled = isBusy;
    telemetryInput.disabled = isBusy;
    updateTelemetryNameControl();
    $(".processing-stop").disabled = !isBusy;
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function showRetryNotice(attempt, maxAttempts) {
    $(".processing-current").textContent = strings[language].retryingItem(attempt, maxAttempts);
  }

  async function waitForRetry(milliseconds) {
    const endAt = Date.now() + milliseconds;
    while (!stopRequested && Date.now() < endAt) await delay(Math.min(500, endAt - Date.now()));
  }

  async function saveRecordWithRetries(record) {
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (await saveRecord(record)) return true;
      if (!cacheInput.checked || attempt >= maxAttempts) return false;
      showRetryNotice(attempt + 1, maxAttempts);
      await waitForRetry(attempt * 500);
    }
    return false;
  }

  async function readEmailWithRetries(descriptor, selector) {
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (stopRequested) return { stopped: true };
      const email = await readOpenedRow(descriptor, selector);
      if (email?.body_text && email.body_text.length >= 20) return { email };
      if (attempt < maxAttempts) {
        showRetryNotice(attempt + 1, maxAttempts);
        await waitForRetry(attempt * 800);
      }
    }
    return { error: Object.assign(new Error(strings[language].emailReadError), { stage: "email_read" }) };
  }

  async function analyzeWithRetries(email, descriptor, receivedDate, cacheKey, apiKey) {
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (stopRequested) return { stopped: true };
      try {
        return await analyzeOne(email, descriptor, receivedDate, cacheKey, apiKey);
      } catch (error) {
        const status = Number(error?.status || 0);
        const retryable = status === 429 || status === 0 || status >= 500;
        if (!retryable || attempt >= maxAttempts) throw error;
        showRetryNotice(attempt + 1, maxAttempts);
        const retryAfterMs = Number(error?.retryAfter) > 0 ? Number(error.retryAfter) * 1000 : 0;
        const backoffMs = attempt === 1 ? 1500 : 4000;
        await waitForRetry(Math.min(30000, Math.max(retryAfterMs, backoffMs)));
      }
    }
    return { stopped: stopRequested };
  }

  function readableFailureReason(error) {
    const t = strings[language];
    if (error?.stage === "email_read") return t.emailReadError;
    if (error?.stage === "cache_body") return t.cacheBodyError;
    if (error?.stage === "cache_write") return t.cacheWriteError;
    if (error?.stage === "email_row") return t.missingRowsError;
    if (error?.status === 429) return t.quota;
    if (error?.status === 401 || error?.status === 403) return t.authError;
    if (error?.status === 413) return t.payloadTooLarge;
    return t.errPrefix + (error?.message || String(error));
  }

  function emitTelemetry(eventType, details = {}) {
    if (!TELEMETRY_ENDPOINT) return;
    try {
      const payload = { event_type: eventType, language, ...details };
      if (telemetryNameInput.checked && lastRecipientDisplayName && !payload.display_name) {
        payload.display_name = lastRecipientDisplayName;
      }
      const pending = chrome.runtime.sendMessage({
        type: "MAILMATE_TELEMETRY_EVENT",
        payload
      });
      if (pending?.catch) pending.catch(() => {});
    } catch { /* Telemetry must never block email analysis. */ }
  }

  function currentTaskSnapshot() {
    const tasks = [...currentRecords.values()].filter((record) => record.analysis?.requires_action && record.analysis?.action?.type !== "none");
    return { action_total: tasks.length, action_completed: tasks.filter((record) => record.completed).length };
  }

  async function runBatch({ unreadConfirmed = false } = {}) {
    if (running) return;
    const t = strings[language];
    if (!consentInput.checked) return setStatus(t.needConsent, "error");
    const apiKey = keyInput.value.trim();
    if (apiKey.length < 20) return setStatus(t.needKey, "error");
    try { await chrome.storage.local.set({ [API_KEY_KEY]: apiKey }); }
    catch { /* Saving is best-effort; do not block an otherwise valid analysis. */ }
    if (!unreadConfirmed) {
      let readState = {};
      try { readState = await chrome.storage.local.get(READ_STATE_CONFIRMED_KEY); }
      catch { /* If local storage cannot be read, show the required guide again. */ }
      if (readState[READ_STATE_CONFIRMED_KEY] !== true) return showUnreadGuide();
    }

    const selector = chooseRowSelector();
    if (!selector) return setStatus(t.noList, "error");
    const allRows = visibleRows(selector);
    if (!allRows.length) return setStatus(t.noRows, "error");

    emitTelemetry("analysis_started", {});
    setBusy(true);
    hasScanned = true;
    stopRequested = false;
    batchIssues = [];
    terminalErrorMessage = "";
    currentProgress = null;
    showSettingsView();
    panel.classList.remove("is-minimized");
    currentFilter = "all";
    searchInput.value = "";
    currentRecords = new Map();
    resultRows.replaceChildren();
    renderRecords();
    if (cacheInput.checked) await loadCache();

    const firstDescriptor = allRows.map(describeRow).find(isSelectedRowDescriptor);
    const initialScrollContainer = findScrollContainer(allRows[0]);
    const originalPosition = scrollPosition(initialScrollContainer);
    const initialSelectedKey = firstDescriptor ? firstDescriptor.key : null;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 14);
    cutoff.setHours(0, 0, 0, 0);

    let recentCount = 0;
    let reusedCount = 0;
    let analyzedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    let progressFailedCount = 0;
    let processedCount = 0;
    let stoppedOnError = false;
    let activeCandidate = null;
    let completedNormally = false;
    let countIncomplete = false;
    const candidates = [];
    const candidateByKey = new Map();
    const countedKeys = new Set();
    const apiDurations = [];
    let checkedCount = 0;

    function remainingAiCalls() {
      return candidates.reduce((sum, candidate) => {
        const cached = cacheInput.checked && candidate.cacheHit;
        return sum + (!candidate.completed && !cached ? 1 : 0);
      }, 0);
    }

    function showAnalysisProgress(currentPosition = null) {
      updateProcessingProgress({
        phase: "analyzing", done: processedCount, total: candidates.length,
        analyzed: analyzedCount, reused: reusedCount, failed: progressFailedCount,
        pendingAi: remainingAiCalls(),
        averageMs: apiDurations.length ? apiDurations.reduce((sum, duration) => sum + duration, 0) / apiDurations.length : 0,
        countIncomplete, currentPosition
      });
    }

    try {
      scrollToPosition(initialScrollContainer, 0);
      await delay(400);
      updateProcessingProgress({ phase: "counting", checked: 0, found: 0 });

      const countSeen = new Set();
      let oldStreak = 0;
      let unknownStreak = 0;
      let noProgress = 0;
      let countDone = false;
      let safetyStopped = false;

      while (!stopRequested && !countDone) {
        const rows = visibleRows(selector).map(describeRow);
        if (!rows.length) {
          countDone = atScrollEnd(initialScrollContainer);
          if (!countDone) countIncomplete = true;
          break;
        }
        const fresh = rows.filter((item) => !countSeen.has(item.key));
        if (!fresh.length) {
          if (atScrollEnd(initialScrollContainer)) {
            countDone = true;
            break;
          }
          const before = scrollPosition(initialScrollContainer);
          scrollDown(initialScrollContainer);
              await delay(200);
          if (Math.abs(scrollPosition(initialScrollContainer) - before) < 3) {
            noProgress++;
            if (noProgress >= 3) {
              countIncomplete = !atScrollEnd(initialScrollContainer);
              countDone = true;
            }
          } else noProgress = 0;
          continue;
        }
        noProgress = 0;

        for (const descriptor of fresh) {
          if (stopRequested || safetyStopped) break;
          countSeen.add(descriptor.key);
          checkedCount++;
          let messageDate = descriptor.receivedDate;

          if (!messageDate) {
            skippedCount++;
            addBatchIssue("skipped", descriptor, t.unknownDate, "received_date");
            unknownStreak++;
            countIncomplete = true;
            emitTelemetry("client_error", { failure_stage: "counting", failure_class: "received_date_unreadable", http_status: 0 });
            if (unknownStreak >= 8) {
              safetyStopped = true;
            }
            updateProcessingProgress({ phase: "counting", checked: checkedCount, found: candidates.length, incomplete: countIncomplete });
            continue;
          }

          unknownStreak = 0;
          if (messageDate < cutoff) {
            oldStreak++;
            if (oldStreak >= 3) countDone = true;
          } else {
            oldStreak = 0;
            unknownStreak = 0;
            if (!countedKeys.has(descriptor.key)) {
              countedKeys.add(descriptor.key);
              const cacheKey = await cacheKeyForRow(descriptor, messageDate);
              const cachedRecord = persistentCache[cacheKey];
              const candidate = {
                key: descriptor.key,
                position: candidates.length + 1,
                descriptor: { ...descriptor, receivedDate: messageDate },
                receivedDate: messageDate,
                cacheKey,
                preloadedEmail: null,
                cacheHit: Boolean(cacheInput.checked && typeof cachedRecord?.analysis?.email_summary_en === "string" && typeof cachedRecord?.analysis?.email_summary_zh === "string"),
                processed: false,
                completed: false
              };
              candidates.push(candidate);
              candidateByKey.set(candidate.key, candidate);
            }
          }
          updateProcessingProgress({ phase: "counting", checked: checkedCount, found: candidates.length, incomplete: countIncomplete });
          if (countDone) break;
        }

        if (stopRequested || safetyStopped || countDone) break;
        if (atScrollEnd(initialScrollContainer)) {
          countDone = true;
          break;
        }
        const before = scrollPosition(initialScrollContainer);
        scrollDown(initialScrollContainer);
        await delay(200);
        if (Math.abs(scrollPosition(initialScrollContainer) - before) < 3) {
          noProgress++;
          if (noProgress >= 3) {
            countIncomplete = !atScrollEnd(initialScrollContainer);
            countDone = true;
          }
        } else noProgress = 0;
      }

      recentCount = candidates.length;
      if (!stopRequested) {
        scrollToPosition(initialScrollContainer, 0);
        await delay(350);
        showAnalysisProgress();
        async function processCandidate(candidate) {
          const descriptor = candidate.descriptor;
          activeCandidate = candidate;
          showAnalysisProgress(candidate.position);

          const finishCandidate = () => {
            candidate.processed = true;
            candidate.completed = true;
            processedCount++;
            activeCandidate = null;
            showAnalysisProgress();
          };

          if (candidate.cacheHit) {
            const stored = persistentCache[candidate.cacheKey];
            const cachedBody = String(stored?.body_text || "").trim();
            if (cachedBody.length >= 20 && reuseCachedRecord(candidate.cacheKey)) {
              reusedCount++;
              finishCandidate();
              return true;
            }

            const recovered = await readEmailWithRetries(descriptor, selector);
            if (recovered.stopped || stopRequested) return false;
            if (recovered.error) {
              throw Object.assign(recovered.error, { stage: "cache_body" });
            }
            const email = recovered.email;
            const repaired = {
              ...stored,
              cache_key: candidate.cacheKey,
              message_id: email.message_id || stored?.message_id || descriptor.stableId,
              subject: email.subject || stored?.subject || descriptor.subject,
              sender: email.sender || stored?.sender || "",
              received_at: stored?.received_at || email.received_at || candidate.receivedDate.toISOString(),
              received_epoch: stored?.received_epoch || candidate.receivedDate.getTime(),
              body_text: email.body_text,
              analysis: stored?.analysis,
              normalized_deadline: stored?.normalized_deadline,
              completed: Boolean(stored?.completed),
              truncated_for_provider: Boolean(stored?.truncated_for_provider),
              usage: stored?.usage || null
            };
            if (!(await saveRecordWithRetries(repaired))) {
              throw Object.assign(new Error(t.cacheWriteError), { stage: "cache_write" });
            }
            currentRecords.set(candidate.cacheKey, repaired);
            renderRecords();
            reusedCount++;
            finishCandidate();
            return true;
          }

          const read = await readEmailWithRetries(descriptor, selector);
          if (read.stopped || stopRequested) return false;
          if (read.error) throw read.error;
          const email = read.email;
          const actualDate = bestRowDate(email, descriptor) || candidate.receivedDate;
          if (!actualDate || actualDate < cutoff) {
            skippedCount++;
            addBatchIssue("skipped", descriptor, t.unknownDate, "message_date", email);
            finishCandidate();
            return true;
          }

          const requestStartedAt = Date.now();
          const result = await analyzeWithRetries(email, descriptor, actualDate, candidate.cacheKey, apiKey);
          if (result?.stopped || stopRequested) return false;
          apiDurations.push(Math.max(1, Date.now() - requestStartedAt));
          analyzedCount++;
          finishCandidate();
          return true;
        }

        for (let scanPass = 1; scanPass <= 2 && !stopRequested && processedCount < candidates.length; scanPass++) {
          scrollToPosition(initialScrollContainer, 0);
          await delay(350);
          const seenThisPass = new Set(candidates.filter((candidate) => candidate.completed).map((candidate) => candidate.key));
          let analysisNoProgress = 0;

          while (processedCount < candidates.length && !stopRequested) {
            const visible = visibleRows(selector).map(describeRow);
            const pendingVisible = visible.filter((descriptor) =>
              candidateByKey.has(descriptor.key) && !seenThisPass.has(descriptor.key)
            );

            if (pendingVisible.length) {
              analysisNoProgress = 0;
              for (const visibleDescriptor of pendingVisible) {
                if (stopRequested) break;
                const candidate = candidateByKey.get(visibleDescriptor.key);
                if (!candidate || seenThisPass.has(candidate.key)) continue;
                seenThisPass.add(candidate.key);
                const succeeded = await processCandidate(candidate);
                if (!succeeded || stopRequested) break;
              }
              continue;
            }

            if (atScrollEnd(initialScrollContainer)) break;
            const before = scrollPosition(initialScrollContainer);
            scrollDown(initialScrollContainer);
            await delay(350);
            if (Math.abs(scrollPosition(initialScrollContainer) - before) < 3) {
              analysisNoProgress++;
              if (analysisNoProgress >= 3) break;
            } else analysisNoProgress = 0;
          }

          if (processedCount >= candidates.length || stopRequested) break;
          if (scanPass === 1) {
            showRetryNotice(2, 2);
            await waitForRetry(800);
          }
        }

        if (!stopRequested && processedCount < candidates.length) {
          const missing = candidates.filter((candidate) => !candidate.completed);
          for (const candidate of missing) {
            failedCount++;
            progressFailedCount++;
            addBatchIssue("failed", candidate.descriptor, t.missingRowsError, "email_row");
            emitTelemetry("client_error", { failure_stage: "batch", failure_class: "email_row_not_found", http_status: 0 });
          }
          throw Object.assign(new Error(t.missingRowsError), { stage: "email_row" });
        }
      }
      completedNormally = !stopRequested && processedCount >= candidates.length;
    } catch (error) {
      if (!stopRequested) {
        stoppedOnError = true;
        terminalErrorMessage = readableFailureReason(error);
        if (activeCandidate) {
          failedCount++;
          progressFailedCount++;
          addBatchIssue("failed", activeCandidate.descriptor, terminalErrorMessage, error?.stage || "analysis");
          emitTelemetry("client_error", {
            failure_stage: error?.stage || "analysis",
            failure_class: error?.status === 429 ? "rate_limit" : "email_processing_error",
            http_status: Number(error?.status || 0)
          });
        } else if (error?.stage !== "email_row") {
          addBatchIssue("failed", null, terminalErrorMessage, error?.stage || "batch");
          emitTelemetry("client_error", {
            failure_stage: error?.stage || "batch",
            failure_class: error?.status === 429 ? "rate_limit" : "batch_processing_error",
            http_status: Number(error?.status || 0)
          });
        }
      }
    } finally {
      scrollToPosition(initialScrollContainer, originalPosition);
      await delay(250);
      if (initialSelectedKey) {
        const originalRow = findRow(selector, initialSelectedKey);
        if (originalRow) originalRow.click();
      }
      setBusy(false);
      const taskSnapshot = currentTaskSnapshot();
      emitTelemetry("analysis_finished", {
        scanned_count: recentCount, analyzed_count: analyzedCount, cache_hit_count: reusedCount,
        skipped_count: skippedCount, failed_count: failedCount, stopped: Boolean(stopRequested),
        ...taskSnapshot
      });
      if (stoppedOnError) {
        showFailureView(terminalErrorMessage);
      } else if (stopRequested || completedNormally) {
        showResultsView();
        renderRecords();
        if (stopRequested) setStatus(t.stopped, "ok");
        else setStatus(t.finished(recentCount, reusedCount, analyzedCount, skippedCount, failedCount, countIncomplete), "ok");
      } else {
        showFailureView(t.missingRowsError);
      }
    }
  }

  function isSelectedRowDescriptor(descriptor) {
    return descriptor && isSelectedRow(descriptor.element);
  }

  launcher.addEventListener("click", () => {
    const opening = panel.hidden;
    panel.hidden = !panel.hidden;
    if (opening) void checkTelemetryOnOpen();
  });
  $(".close").addEventListener("click", () => { panel.hidden = true; });
  $(".minimize").addEventListener("click", () => { panel.classList.toggle("is-minimized"); });
  $(".settings-open").addEventListener("click", () => {
    showSettingsView();
    startButton.focus();
  });
  $(".issues-open").addEventListener("click", showIssuesModal);
  $(".apology-issues").addEventListener("click", showIssuesModal);
  $(".apology-settings").addEventListener("click", () => { showSettingsView(); startButton.focus(); });
  $(".apology-retry").addEventListener("click", () => { runBatch(); });
  filterButtons.forEach((button) => button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    renderRecords();
  }));
  searchInput.addEventListener("input", renderRecords);
  languageSelect.addEventListener("change", () => {
    setLanguage(languageSelect.value);
    chrome.storage.local.set({ [LANGUAGE_KEY]: language }).catch(() => {});
  });
  keyInput.addEventListener("input", persistApiKeySoon);
  keyInput.addEventListener("change", () => { void persistApiKeyNow(); });
  $(".guide-cancel").addEventListener("click", closeUnreadGuide);
  unreadGuideBack.addEventListener("click", () => {
    if (unreadGuideStage > 0) setUnreadGuideStage(unreadGuideStage - 1);
  });
  unreadGuideStart.addEventListener("click", () => {
    if (unreadGuideStage < 4) {
      setUnreadGuideStage(unreadGuideStage + 1);
      return;
    }
    if (unreadGuideStage !== 4) return;
    chrome.storage.local.set({ [READ_STATE_CONFIRMED_KEY]: true }).then(() => {
      closeUnreadGuide();
      void runBatch({ unreadConfirmed: true });
    }).catch(() => {
      $(".guide-note").textContent = strings[language].guideSaveError;
    });
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
      if (!unreadGuideLayer.hidden) {
        closeUnreadGuide();
        return;
      }
      $(".modal-layer").hidden = true;
      $(".source-preview").hidden = true;
    }
  });
  startButton.addEventListener("click", () => { void runBatch(); });
  stopButton.addEventListener("click", () => { stopRequested = true; setStatus(strings[language].stopped); });
  $(".processing-stop").addEventListener("click", () => { stopRequested = true; setStatus(strings[language].stopped); });
  clearButton.addEventListener("click", () => { clearCache(); });
  telemetryInput.addEventListener("change", () => {
    const changes = { [TELEMETRY_CONSENT_KEY]: telemetryInput.checked };
    if (!telemetryInput.checked) {
      telemetryNameInput.checked = false;
      changes[TELEMETRY_NAME_CONSENT_KEY] = false;
    }
    chrome.storage.local.set(changes).catch(() => {});
    updateTelemetryNameControl();
    telemetryCheckResult = telemetryInput.checked ? null : { configured: true, enabled: false };
    renderTelemetryNote();
  });
  telemetryNameInput.addEventListener("change", () => {
    chrome.storage.local.set({ [TELEMETRY_NAME_CONSENT_KEY]: telemetryNameInput.checked }).catch(() => {});
  });

  chrome.storage.local.get([LANGUAGE_KEY, TELEMETRY_CONSENT_KEY, TELEMETRY_NAME_CONSENT_KEY, API_KEY_KEY]).then((value) => {
    if (value && (value[LANGUAGE_KEY] === "zh" || value[LANGUAGE_KEY] === "en")) setLanguage(value[LANGUAGE_KEY]);
    telemetryInput.checked = value?.[TELEMETRY_CONSENT_KEY] !== false;
    telemetryNameInput.checked = value?.[TELEMETRY_NAME_CONSENT_KEY] === true;
    updateTelemetryNameControl();
    keyInput.value = typeof value?.[API_KEY_KEY] === "string" ? value[API_KEY_KEY] : "";
  }).catch(() => {});

  setLanguage(language);
})();
