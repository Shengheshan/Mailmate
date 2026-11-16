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

这条工作线是独立的 Chrome / Edge 扩展，读取用户正常登录后 Outlook 网页中显示的邮件，并通过 **Groq 在线 API** 分析；不使用 Ollama，也不运行上面的 180 封离线评测。

- 用户点击一次“开始分析”，扩展自动扫描当前 Outlook 文件夹近两周的邮件项。
- 扫描完成或停止后，在页面右下角展示列表；按重要性和截止日期排序，支持搜索、状态筛选、完成勾选和原文预览。
- 每封邮件同时生成中文和英文摘要及行动内容，可即时切换语言；缓存命中时跳过重复模型调用。
- 扩展目录、安装步骤和隐私说明见 [`mailmate-outlook-mvp/README.md`](mailmate-outlook-mvp/README.md)。

**下载：** [Chrome / Edge 扩展安装包](https://github.com/Shengheshan/Mailmate/raw/refs/heads/mailmate-outlook-mvp/mailmate-outlook-mvp/Mailmate-Outlook-Extension.zip)。解压后，在浏览器扩展管理页开启“开发者模式”，加载直接包含 `manifest.json` 的文件夹。

此 Demo 使用 Groq API，当前由演示者输入自己的 API Key；共享 Key 不写进公开扩展包。邮件正文只在用户确认后发送给 Groq（美国），链接地址默认不发送。扩展使用前需关闭 Outlook 的自动标记已读设置。当前范围仅限日期可识别的近两周邮件项，不读取附件；面向用户免输入 API Key 提供服务还需要部署 Mailmate 后端。

## 其他 Outlook 接入代码

仓库还保留了较早的 Microsoft Graph API 接入试验（`mailmate_ai.py`、`outlook_test.py`）。它与浏览器扩展 Demo 分开维护；扩展通过 Outlook 网页读取可见内容，不调用 Graph API。

## 项目结构

```text
Mailmate/
├── mailmate-outlook-mvp/       # Groq 驱动的 Chrome / Edge 扩展 Demo
├── mailmate_ai_offline.py      # Ollama 本地离线邮件分析
├── time_normalizer.py          # 离线流程日期归一化
├── consistency_validator.py    # 离线流程 JSON 校验
├── evaluate_results.py         # 离线评测
├── data/                       # 离线测试邮件与标注
├── results/                    # 离线预测与评测报告
├── ARCHITECTURE.md             # 离线架构说明
└── FINAL_EVALUATION.md         # 180 封离线评测报告
```
