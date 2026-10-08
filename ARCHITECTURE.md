# Mailmate 架构设计

## 1. 设计原则

Mailmate 的核心设计原则是：

> 将概率性的语义理解，与确定性的业务逻辑分离。

大语言模型负责理解邮件内容，但日期计算、字段约束和结构一致性等任务交给 Python 完成。

整体流程：

```text
Email
  ↓
LLM Semantic Extraction
  ↓
Consistency Validator
  ↓
Time Normalizer
  ↓
Structured Result
```

## 2. 邮件输入

Mailmate 支持两种输入方式。

### Outlook

通过 Microsoft Graph API 获取 Outlook 邮件。

```text
Outlook
   ↓
Microsoft Graph API
   ↓
Normalized Email
```

### Offline Benchmark

离线测试直接读取：

```text
data/offline_test_emails_v1.json
```

这样可以将邮箱接入能力与 AI 理解能力分开评测。

## 3. 语义理解层

使用模型：

```text
Qwen3.5-4B
```

通过 Ollama 本地运行：

```text
http://localhost:11434/api/chat
```

主要配置：

```text
think = false
stream = false
format = json
temperature = 0.1
```

模型负责抽取：

```text
category
importance
requires_action
requires_reply
user_deadline
expected_event
action
```

模型只负责提取原始时间表达，不直接计算最终绝对日期。

例如：

```text
tomorrow at 6 PM
```

模型输出：

```json
{
  "raw_text": "tomorrow at 6 PM"
}
```

## 4. Consistency Validator

`consistency_validator.py` 用于检查模型输出的结构和逻辑一致性。

主要处理：

```text
category 枚举是否合法
importance 枚举是否合法
action.type 是否合法
boolean 字段是否合法
required field 是否存在
action / reply 是否存在逻辑冲突
时间字段是否有原文依据
```

例如：

```text
action.type = reply_interest
requires_action = false
```

属于明确的结构矛盾。

Validator 可以将其修正为：

```text
requires_action = true
```

Validator 不负责重新理解邮件语义。

## 5. Time Normalizer

`time_normalizer.py` 负责确定性的时间归一化。

默认时区：

```text
Australia/Sydney
```

支持：

```text
tomorrow
Friday
this Thursday
next Monday
14 October at 10 AM
within three business days
by the end of next week
between 1 AM and 3 AM this Sunday
```

架构思路：

```text
LLM
↓
提取原始时间表达

Python
↓
计算绝对日期和时间
```

这样可以减少小模型在日期算术上的错误。

## 6. 上下文依赖时间

部分时间无法根据单封邮件计算。

例如：

```text
one day before the interview
```

如果当前邮件没有 interview 的日期，则系统保留：

```json
{
  "raw_text": "one day before the interview",
  "normalized": null,
  "depends_on_context": true
}
```

系统不会猜测不存在的日期。

## 7. 最终结构

示例：

```json
{
  "category": "career",
  "importance": "high",
  "requires_action": true,
  "requires_reply": true,
  "user_deadline": {
    "raw_text": "by Friday",
    "normalized": "2026-10-16",
    "precision": "date"
  },
  "expected_event": {
    "event": "interview",
    "raw_text": "20 October at 10 AM",
    "normalized": "2026-10-20T10:00:00",
    "precision": "datetime"
  },
  "action": {
    "type": "reply_confirm",
    "target": "interview attendance"
  }
}
```

## 8. 评测设计

Mailmate 不使用单一 Accuracy 衡量系统质量。

主要指标：

```text
Action Recall / Precision
Reply Recall / Precision
Deadline Recall / Precision
Deadline Date Accuracy
Category Accuracy
Action Type Accuracy
Expected Event Recall / Precision
```

对于 Action 和 Deadline：

```text
False Negative 的风险高于 False Positive
```

因为漏掉真正需要处理的任务，比多提醒一次更加严重。