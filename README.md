# Mailmate

Mailmate 探索如何从邮件中提取重点、截止日期和待办事项。仓库当前包含两条相互独立的工作线：本地模型离线评测，以及使用 Groq API 的 Outlook 浏览器扩展 Demo。两者的数据来源、模型环境和评估方式分别说明如下。

**[下载 Chrome / Edge 浏览器扩展](https://github.com/Shengheshan/Mailmate/raw/refs/heads/mailmate-outlook-mvp/mailmate-outlook-mvp/Mailmate-Outlook-Extension.zip)** · [查看扩展使用说明](mailmate-outlook-mvp/README.md)

## A. 本地模型与 180 封离线评测

这条工作线使用本地 **Qwen3.5-4B + Ollama** 分析独立的离线测试邮件，并由 Python 完成日期归一化和一致性校验。180 封评测集和结果属于这套离线流程。

```text
离线测试邮件 JSON
        ↓
Qwen3.5-4B（Ollama，本地运行）
        ↓
逐封结构化 JSON
        ↓
Python 日期归一化与一致性校验
        ↓
180 封离线评测指标
```

运行方式：

```bash
ollama pull qwen3.5:4b
pip install -r requirements.txt
python mailmate_ai_offline.py
python evaluate_results.py
```

主要文件：

- `mailmate_ai_offline.py`：调用本地 Ollama 分析邮件。
- `time_normalizer.py`、`consistency_validator.py`：处理日期和结构校验。
- `data/`、`results/`：离线测试输入、Gold label、预测结果和评测报告。
- `ARCHITECTURE.md`、`FINAL_EVALUATION.md`：离线流程和 180 封评测说明。

## B. Outlook 浏览器扩展 Demo

### 获取 Groq API Key

首次使用需要准备自己的 Groq API Key：登录 [Groq Console](https://console.groq.com/)，进入 [API Keys](https://console.groq.com/keys) 创建密钥，然后在 Outlook 页面打开 Mailmate 并粘贴到密钥输入框。密钥只用于当前页面发起模型请求，不会保存到扩展缓存；请像密码一样保管，不要发给他人或提交到 GitHub。Groq 模型与免费额度可能调整，当前账户的可用模型和限额请查看 [Groq 限额说明](https://console.groq.com/docs/rate-limits)。详细操作见扩展 README。

这条工作线是独立的 Chrome / Edge 扩展，读取用户正常登录后 Outlook 网页中显示的邮件，并通过 **Groq 在线 API** 分析；不使用 Ollama，也不运行上面的 180 封离线评测。

- 用户点击一次“开始分析”，扩展先快速统计当前 Outlook 文件夹近两周邮件数量，再逐封分析；统计阶段不打开邮件、不调用 AI，分析阶段显示处理序号、完成百分比和 AI 剩余时间估算。
- 全部处理完成或用户主动停止后，在页面右下角展示列表；若读取或模型请求连续失败，会显示中断说明和原因，不会提前进入汇总页。
- 每封邮件同时生成中文和英文摘要及行动内容，可即时切换语言；缓存命中时跳过重复模型调用。
- 扩展目录、安装步骤和隐私说明见 [`mailmate-outlook-mvp/README.md`](mailmate-outlook-mvp/README.md)。
- 去标识使用统计和 Groq 错误诊断通过 Cloudflare Worker + D1 服务实现，扩展默认开启，可在面板中关闭；不会发送邮件正文、主题、发件人或 API Key。后端部署说明见 [`mailmate-telemetry/README.md`](mailmate-telemetry/README.md)。

**下载：** [Chrome / Edge 扩展安装包](https://github.com/Shengheshan/Mailmate/raw/refs/heads/mailmate-outlook-mvp/mailmate-outlook-mvp/Mailmate-Outlook-Extension.zip)。解压后，在浏览器扩展管理页开启“开发者模式”，加载直接包含 `manifest.json` 的文件夹。

此 Demo 使用 Groq API，由每位使用者输入自己的 API Key；共享 Key 不写进公开扩展包。邮件正文只在用户确认后发送给 GroqCloud，在美国处理；链接地址默认不发送。Groq 默认不保留推理请求的客户输入和输出，但在系统可靠性或滥用监控需要时可能暂存相关日志最长 30 天；用户可在 Groq Console 的 Data Controls 查看或启用 Zero Data Retention（ZDR）。详见 [Groq 数据说明](https://console.groq.com/docs/your-data)。扩展使用前需关闭 Outlook 的自动标记已读设置。当前范围仅限日期可识别的近两周邮件项，不读取附件；面向用户免输入 API Key 提供服务还需要部署 Mailmate 后端。

## 其他 Outlook 接入代码

仓库还保留了较早的 Microsoft Graph API 接入试验（`mailmate_ai.py`、`outlook_test.py`）。它与浏览器扩展 Demo 分开维护；扩展通过 Outlook 网页读取可见内容，不调用 Graph API。

## 项目结构

```text
Mailmate/
├── mailmate-outlook-mvp/       # Groq 驱动的 Chrome / Edge 扩展 Demo
├── mailmate-telemetry/          # 可选的 Cloudflare 遥测与错误诊断后端
├── mailmate_ai_offline.py      # Ollama 本地离线邮件分析
├── time_normalizer.py          # 离线流程日期归一化
├── consistency_validator.py    # 离线流程 JSON 校验
├── evaluate_results.py         # 离线评测
├── data/                       # 离线测试邮件与标注
├── results/                    # 离线预测与评测报告
├── ARCHITECTURE.md             # 离线架构说明
└── FINAL_EVALUATION.md         # 180 封离线评测报告
```
