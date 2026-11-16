# Mailmate

Mailmate 是一个面向学术与行政邮件场景的 AI 邮件助手。

**[下载 Chrome / Edge 扩展](https://github.com/Shengheshan/Mailmate/raw/refs/heads/mailmate-outlook-mvp/mailmate-outlook-mvp/Mailmate-Outlook-Extension.zip)** · [扩展安装与使用说明](mailmate-outlook-mvp/README.md)

它会把一封自然语言邮件转换成结构化信息，包括：

- 邮件类别与重要程度
- 是否需要用户行动
- 是否需要回复
- 用户截止时间
- 未来事件
- 建议动作

仓库包含两条验证路径：离线原型使用 **Qwen3.5-4B + Ollama** 和 Python 完成邮件抽取与校验；Chrome / Edge 扩展通过 Groq API 分析 Outlook 网页邮件，并在页面内展示批量结果。

## 架构

```text
Outlook / Offline Email
        ↓
Qwen3.5-4B via Ollama
        ↓
结构化语义抽取
        ↓
Consistency Validator + Time Normalizer
        ↓
规范化逐封 JSON
        ↓
跨邮件摘要（`mailmate_summary.py`）
        ↓
交互式任务/提醒视图
        ↓
Offline Evaluation
```

核心设计：

```text
LLM
负责语义理解

Python
负责确定性的时间计算和一致性检查
```

详细设计见：

- `ARCHITECTURE.md`
- `FINAL_EVALUATION.md`

## 项目结构

```text
Mailmate/
├── README.md
├── ARCHITECTURE.md
├── FINAL_EVALUATION.md
├── LICENSE
├── requirements.txt
├── .gitignore
│
├── mailmate_ai.py
├── mailmate_ai_offline.py
├── mailmate_summary.py
├── outlook_test.py
├── consistency_validator.py
├── time_normalizer.py
├── evaluate_results.py
│
├── data/
│   ├── offline_test_emails_v1.json
│   ├── offline_gold_v1.json
│   └── benchmark_manifest_v1.json
│
└── results/
    ├── ai_results_offline_v1.json
    └── evaluation_report_offline_v1.json
```

## 运行方式

### 1. 安装 Ollama 模型

```bash
ollama pull qwen3.5:4b
```

确认 Ollama 正常运行：

```bash
ollama list
```

### 2. 安装 Python 依赖

推荐 Python 3.10+。

```bash
pip install -r requirements.txt
```

### 3. 运行离线测试

```bash
python mailmate_ai_offline.py
```

运行结果会保存到：

```text
results/ai_results_offline_v1.json
```

### 4. 运行评测

```bash
python evaluate_results.py
```

评测结果会保存到：

```text
results/evaluation_report_offline_v1.json
```

## Outlook 接入

项目同时支持通过 Microsoft Graph API 读取 Outlook 邮件。

相关代码：

```text
outlook_test.py
mailmate_ai.py
```

Microsoft Entra 的配置建议通过 `.env` 保存，不要将真实 Token、邮箱数据或 `.env` 上传到 GitHub。

### 浏览器扩展

**[下载 Mailmate 浏览器扩展](https://github.com/Shengheshan/Mailmate/raw/refs/heads/mailmate-outlook-mvp/mailmate-outlook-mvp/Mailmate-Outlook-Extension.zip)**。支持 Chrome 和 Microsoft Edge。

用户正常登录 Outlook 并进入邮件文件夹后，点击 Mailmate 即可扫描当前文件夹近两周的邮件。扫描结束或停止后，右下角列表按重要性和截止日期排序，并支持双语切换、搜索、完成勾选及原文预览。

扩展通过 Outlook 页面读取可见邮件正文，不调用 Microsoft Graph，也不读取密码、Cookie 或访问令牌。正文只在用户同意后发送给 Groq（美国）；当前版本由使用者输入自己的 API Key，公开包不会内置共享密钥。面向更多用户提供免输入服务前，需要部署由 Mailmate 管理模型密钥的后端。

使用前需关闭 Outlook 的自动标记已读设置。当前仅扫描日期可识别的近两周邮件项，不读取附件；Outlook 页面结构变化可能影响读取。完整步骤、缓存行为和数据处理范围见 [扩展说明](mailmate-outlook-mvp/README.md)。

## 当前状态

Mailmate RC1 已完成 180 条独立离线测试。

详细指标和失败分析见：

`FINAL_EVALUATION.md`
