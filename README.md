# Mailmate

Mailmate 是一个面向学术与行政邮件场景的 AI 邮件助手。

它会把一封自然语言邮件转换成结构化信息，包括：

- 邮件类别与重要程度
- 是否需要用户行动
- 是否需要回复
- 用户截止时间
- 未来事件
- 建议动作

项目使用 **Qwen3.5-4B + Ollama** 进行本地语义理解，并使用 Python 完成时间归一化和输出一致性校验。

## 架构

```text
Outlook / Offline Email
        ↓
Qwen3.5-4B via Ollama
        ↓
结构化语义抽取
        ↓
Consistency Validator
        ↓
Time Normalizer
        ↓
结构化邮件状态
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

## 当前状态

Mailmate RC1 已完成 180 条独立离线测试。

详细指标和失败分析见：

`FINAL_EVALUATION.md`