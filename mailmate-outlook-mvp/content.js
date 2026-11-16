(() => {
  if (document.getElementById("mailmate-mvp-host")) return;

  const host = document.createElement("div");
  host.id = "mailmate-mvp-host";
  const shadow = host.attachShadow({ mode: "closed" });
  document.documentElement.append(host);

  const styles = `
    :host { all: initial; }
    * { box-sizing: border-box; }
    .launcher { position: fixed; z-index: 2147483647; right: 22px; bottom: 22px; border: 0; border-radius: 999px; padding: 13px 18px; color: #fff; background: #2457d6; box-shadow: 0 6px 24px #10255042; font: 600 14px/1.2 system-ui, sans-serif; cursor: pointer; }
    .launcher:hover { background: #1747bf; }
    .panel { position: fixed; z-index: 2147483647; right: 22px; bottom: 78px; width: min(410px, calc(100vw - 28px)); max-height: min(76vh, 760px); overflow: auto; border: 1px solid #dce3ee; border-radius: 16px; color: #182438; background: #f7f9fc; box-shadow: 0 18px 54px #10255035; font: 14px/1.45 system-ui, sans-serif; }
    .panel[hidden] { display: none; }
    header { display:flex; align-items:center; justify-content:space-between; padding: 16px 18px 12px; background:#fff; border-bottom:1px solid #e5eaf2; position:sticky; top:0; }
    h1 { margin:0; font-size:17px; line-height:1.2; }
    h2 { margin:15px 0 7px; font-size:14px; }
    .close { border:0; background:transparent; color:#5d687a; font:22px/1 system-ui; cursor:pointer; padding:3px 6px; }
    .content { padding: 13px 17px 18px; }
    .hint { color:#536176; font-size:12px; margin:0 0 11px; }
    label { display:block; margin:10px 0 5px; font-size:12px; font-weight:650; color:#334259; }
    input[type=password], select { width:100%; padding:9px 10px; border:1px solid #ccd5e3; border-radius:8px; background:#fff; color:#17243a; font:13px system-ui,sans-serif; }
    .check { display:flex; gap:8px; align-items:flex-start; margin:11px 0; font-size:12px; font-weight:400; color:#37465c; }
    .check input { margin:3px 0 0; flex:0 0 auto; }
    button.primary { width:100%; border:0; border-radius:8px; padding:10px 12px; color:white; background:#2457d6; font:650 13px system-ui,sans-serif; cursor:pointer; }
    button.primary:disabled { opacity:.55; cursor:wait; }
    .status { min-height:18px; margin:10px 0 0; color:#536176; font-size:12px; }
    .status.error { color:#a32828; }
    .status.ok { color:#116149; }
    .mailmeta { padding:10px; border:1px solid #dce3ee; border-radius:9px; background:#fff; font-size:12px; }
    .mailmeta b { display:block; margin-bottom:4px; font-size:13px; overflow-wrap:anywhere; }
    .badge { display:inline-block; margin:6px 5px 0 0; padding:3px 8px; border-radius:999px; background:#e8eef9; font-size:11px; }
    .badge.high { background:#fde8e7; color:#9c2626; }
    .badge.medium { background:#fff2d5; color:#805400; }
    .badge.low { background:#e8f4ee; color:#1e6847; }
    .field { padding:9px 10px; margin-top:7px; border-radius:8px; background:white; border:1px solid #e3e8f0; }
    .field .name { display:block; margin-bottom:3px; color:#66748a; font-size:11px; font-weight:650; }
    .field .value { overflow-wrap:anywhere; white-space:pre-wrap; }
    details { margin-top:11px; border-top:1px solid #dce3ee; padding-top:9px; }
    summary { cursor:pointer; color:#36517f; font-size:12px; font-weight:600; }
    pre { max-height:180px; overflow:auto; margin:8px 0 0; padding:9px; border-radius:7px; background:white; white-space:pre-wrap; overflow-wrap:anywhere; font:12px/1.45 system-ui,sans-serif; }
    .foot { margin:11px 0 0; color:#6b7788; font-size:11px; }
  `;
  const style = document.createElement("style");
  style.textContent = styles;

  const strings = {
    zh: {
      brand: "Mailmate 邮件助手", open: "Mailmate", close: "关闭", language: "显示语言",
      languageZh: "简体中文", languageEn: "English", key: "Groq API Key（仅本次使用，不保存）",
      intro: "请先在 Outlook 打开一封邮件。正文会发送到 Groq（美国）；使用前请确认学校规则及 Groq 的数据保留设置。",
      consent: "我同意将当前打开邮件的正文发送到 Groq（美国）进行 AI 分析。",
      links: "允许同时发送邮件中的链接地址（可能含有一次性或个人专属链接）",
      analyze: "读取并分析当前邮件", reading: "正在读取邮件…", sending: "正在请求 AI 分析…",
      noMail: "没有定位到当前邮件正文。请在 Outlook 阅读窗格中打开一封邮件后再试。",
      captured: "已读取当前打开邮件。扩展没有点击邮件，也没有修改已读状态。",
      summary: "邮件摘要", action: "需要行动", deadline: "截止日期（邮件原文）", event: "相关事件（邮件原文）",
      category: "分类", importance: "重要性", reply: "需要回复", noAction: "无需行动",
      source: "查看读取到的邮件原文", disclosure: "此 MVP 只处理当前打开的一封邮件；不会批量扫描、自动同步或保存邮件。日期仅展示原文表达，尚未接入日期归一化。",
      linkCount: (n) => `正文中找到 ${n} 个可见链接；默认不把链接地址发送给模型。`, missingKey: "请先输入 Groq API Key。",
      consentRequired: "请先勾选同意，扩展才会向 Groq 发送邮件内容。", subjectUnknown: "（未识别主题）",
      sender: "发件人未识别", received: "未识别发送时间", linked: (n) => `可见链接：${n} 个`,
      done: "分析完成。邮件正文只在本次页面和请求中处理，没有写入本地存储。"
    },
    en: {
      brand: "Mailmate Email Assistant", open: "Mailmate", close: "Close", language: "Display language",
      languageZh: "简体中文", languageEn: "English", key: "Groq API key (used once, never saved)",
      intro: "Open an email in Outlook first. Its body is sent to Groq (US); check your school's rules and Groq's data-retention settings before use.",
      consent: "I agree to send the currently open email body to Groq (US) for AI analysis.",
      links: "Also send link addresses from this email (may contain personal or one-time links)",
      analyze: "Read and analyze this email", reading: "Reading the open email…", sending: "Requesting AI analysis…",
      noMail: "Could not locate the open email body. Open an email in Outlook's reading pane and try again.",
      captured: "Read the currently open email. The extension did not click an email or change its read status.",
      summary: "Email summary", action: "Action needed", deadline: "Deadline (source wording)", event: "Related event (source wording)",
      category: "Category", importance: "Importance", reply: "Reply needed", noAction: "No action needed",
      source: "View captured email text", disclosure: "This MVP analyzes one currently open email only. It does not batch scan, sync automatically, or save email. Dates are shown as source wording; date normalization is not connected yet.",
      linkCount: (n) => `Found ${n} visible link(s); link addresses are not sent to the model by default.`, missingKey: "Enter your Groq API key first.",
      consentRequired: "Check the consent box before sending email content to Groq.", subjectUnknown: "(Subject not identified)",
      sender: "Sender not identified", received: "Sent time not identified", linked: (n) => `Visible links: ${n}`,
      done: "Analysis complete. The email body was not written to local storage."
    }
  };

  const root = document.createElement("div");
  root.innerHTML = `
    <button class="launcher" type="button"></button>
    <section class="panel" hidden>
      <header><h1></h1><button class="close" type="button" aria-label="Close">×</button></header>
      <div class="content">
        <label class="language-label"></label><select class="language"><option value="zh"></option><option value="en"></option></select>
        <p class="hint intro"></p>
        <label class="key-label"></label><input class="api-key" type="password" autocomplete="off" spellcheck="false">
        <label class="check"><input class="consent" type="checkbox"><span class="consent-text"></span></label>
        <label class="check"><input class="send-links" type="checkbox"><span class="links-text"></span></label>
        <button class="primary analyze" type="button"></button>
        <p class="status" aria-live="polite"></p>
        <div class="result" hidden></div>
        <p class="foot disclosure"></p>
      </div>
    </section>`;
  shadow.append(style, root);

  const $ = (selector) => root.querySelector(selector);
  const launcher = $(".launcher");
  const panel = $(".panel");
  const languageSelect = $(".language");
  const keyInput = $(".api-key");
  const consentInput = $(".consent");
  const sendLinksInput = $(".send-links");
  const analyzeButton = $(".analyze");
  const status = $(".status");
  const resultBox = $(".result");
  let language = (navigator.language || "en").toLowerCase().startsWith("zh") ? "zh" : "en";

  function text(tag, className, value) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = value || "";
    return element;
  }

  function setLanguage(next) {
    language = next === "zh" ? "zh" : "en";
    const t = strings[language];
    $("header h1").textContent = t.brand;
    launcher.textContent = t.open;
    $(".close").setAttribute("aria-label", t.close);
    $(".language-label").textContent = t.language;
    languageSelect.options[0].textContent = t.languageZh;
    languageSelect.options[1].textContent = t.languageEn;
    languageSelect.value = language;
    $(".intro").textContent = t.intro;
    $(".key-label").textContent = t.key;
    $(".consent-text").textContent = t.consent;
    $(".links-text").textContent = t.links;
    analyzeButton.textContent = t.analyze;
    $(".disclosure").textContent = t.disclosure;
  }
  setLanguage(language);

  function isVisible(element) {
    if (!element || !element.getClientRects().length) return false;
    const style = getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
  }

  function normalizeText(value) {
    return String(value || "").replace(/\u00a0/g, " ").split("\n").map((line) => line.replace(/[\t ]+/g, " ").trim()).filter(Boolean).join("\n").trim();
  }

  function extractCurrentEmail() {
    const main = document.querySelector('[role="main"]') || document;
    const bodySelectors = [
      '[data-testid="message-body"]', '[data-testid="messageBody"]',
      '[aria-label="Message body"]', '[aria-label="邮件正文"]',
      '[data-testid*="message-body" i]', '[data-testid*="messageBody" i]',
      '[id*="messageBody" i]', '[class*="message-body" i]', '[role="document"]'
    ];
    const seen = new Set();
    const candidates = [];
    bodySelectors.forEach((selector, order) => {
      for (const element of main.querySelectorAll(selector)) {
        if (seen.has(element)) continue;
        seen.add(element);
        if (!isVisible(element) || element.isContentEditable || element.closest('[contenteditable="true"]')) continue;
        const body = normalizeText(element.innerText || "");
        if (body.length < 30 || body.length > 100_000) continue;
        if (element.querySelectorAll('[role="row"],[role="option"],[role="listitem"]').length > 2) continue;
        candidates.push({ element, body, order });
      }
    });
    candidates.sort((a, b) => a.order - b.order || a.body.length - b.body.length);
    const selected = candidates[0];
    if (!selected) return null;

    const subjectElement = main.querySelector('[data-testid*="subject" i], [aria-label*="Subject" i], [aria-label*="主题"], [role="heading"][aria-level="2"]') || main.querySelector('h1, h2');
    const subject = normalizeText(subjectElement?.innerText || subjectElement?.getAttribute("aria-label") || "") || strings[language].subjectUnknown;
    const senderElement = main.querySelector('[data-testid*="sender" i], [aria-label*="From" i], [aria-label*="发件人"], [email], button[title*="@"]');
    const sender = normalizeText(senderElement?.innerText || senderElement?.getAttribute("title") || senderElement?.getAttribute("aria-label") || senderElement?.getAttribute("email") || "") || strings[language].sender;
    const timeElement = main.querySelector('time[datetime], [data-testid*="received" i], [aria-label*="Received" i], [aria-label*="接收时间"]');
    const receivedAt = normalizeText(timeElement?.getAttribute("datetime") || timeElement?.getAttribute("title") || timeElement?.innerText || "") || null;
    const links = [...selected.element.querySelectorAll('a[href]')]
      .filter((anchor) => isVisible(anchor))
      .map((anchor) => {
        let url;
        try { url = new URL(anchor.href); } catch { return null; }
        if (!["http:", "https:", "mailto:"].includes(url.protocol)) return null;
        return {
          label: normalizeText(anchor.innerText || anchor.getAttribute("aria-label") || "(link)").slice(0, 160),
          url: url.href.slice(0, 2048)
        };
      })
      .filter(Boolean)
      .slice(0, 20);

    return {
      subject: subject.slice(0, 300),
      sender: sender.slice(0, 300),
      received_at: receivedAt,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
      body_text: selected.body.slice(0, 20_000),
      links,
      links_total: links.length,
      source_selector: bodySelectors[selected.order]
    };
  }

  function addField(parent, label, value) {
    if (value === null || value === undefined || value === "") return;
    const field = text("div", "field", "");
    field.append(text("span", "name", label), text("span", "value", String(value)));
    parent.append(field);
  }

  function renderAnalysis(analysis, email, t) {
    resultBox.replaceChildren();
    resultBox.hidden = false;
    const meta = text("div", "mailmeta", "");
    meta.append(text("b", "", email.subject));
    meta.append(text("div", "", `${email.sender}${email.received_at ? ` · ${email.received_at}` : ""}`));
    meta.append(text("span", `badge ${analysis.importance}`, `${t.importance}: ${analysis.importance}`));
    meta.append(text("span", "badge", `${t.category}: ${analysis.category}`));
    resultBox.append(meta);
    addField(resultBox, t.summary, analysis.email_summary);
    addField(resultBox, t.action, analysis.requires_action ? `${analysis.action.type}${analysis.action.target ? ` — ${analysis.action.target}` : ""}` : t.noAction);
    addField(resultBox, t.reply, analysis.requires_reply ? "Yes" : "No");
    addField(resultBox, t.deadline, analysis.user_deadline?.raw_text || "");
    addField(resultBox, t.event, analysis.expected_event ? `${analysis.expected_event.event || ""} ${analysis.expected_event.raw_text || ""}`.trim() : "");
    const linkNote = text("p", "foot", t.linkCount(email.links_total));
    resultBox.append(linkNote);
    const details = document.createElement("details");
    details.append(text("summary", "", t.source));
    details.append(text("pre", "", email.body_text));
    resultBox.append(details);
  }

  launcher.addEventListener("click", () => { panel.hidden = !panel.hidden; });
  $(".close").addEventListener("click", () => { panel.hidden = true; });
  languageSelect.addEventListener("change", () => setLanguage(languageSelect.value));

  analyzeButton.addEventListener("click", async () => {
    const t = strings[language];
    status.className = "status";
    resultBox.hidden = true;
    resultBox.replaceChildren();
    if (!consentInput.checked) {
      status.textContent = t.consentRequired;
      status.classList.add("error");
      return;
    }
    const apiKey = keyInput.value;
    if (!apiKey || apiKey.length < 20) {
      status.textContent = t.missingKey;
      status.classList.add("error");
      return;
    }
    analyzeButton.disabled = true;
    status.textContent = t.reading;
    let email;
    try {
      email = extractCurrentEmail();
      if (!email) throw new Error(t.noMail);
      status.textContent = `${t.sending} ${t.linkCount(email.links_total)}`;
      const payloadEmail = {
        subject: email.subject,
        sender: email.sender,
        received_at: email.received_at,
        timezone: email.timezone,
        body_text: email.body_text,
        links: sendLinksInput.checked ? email.links : email.links.map(({ label }) => ({ label }))
      };
      const response = await chrome.runtime.sendMessage({
        type: "MAILMATE_ANALYZE_CURRENT_EMAIL",
        payload: { apiKey, language, email: payloadEmail }
      });
      keyInput.value = "";
      if (!response?.ok) throw new Error(response?.error || "Analysis failed.");
      renderAnalysis(response.analysis, email, t);
      status.textContent = t.done;
      status.classList.add("ok");
    } catch (error) {
      keyInput.value = "";
      status.textContent = error?.message || String(error);
      status.classList.add("error");
    } finally {
      analyzeButton.disabled = false;
    }
  });
})();
