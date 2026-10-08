# Mailmate RC1 最终评测

## 1. 评测目标

本次评测用于验证冻结后的 Mailmate RC1 Pipeline。

最终测试开始后，不再根据测试结果修改：

```text
Prompt
Time Normalizer
Consistency Validator
Evaluation Logic
```

开发阶段使用 30 条测试邮件。

最终测试使用独立生成的 180 条离线邮件。

## 2. 测试配置

模型：

```text
Qwen3.5-4B
```

推理方式：

```text
Ollama Local Inference
```

Pipeline：

```text
Email
  ↓
Qwen Semantic Extraction
  ↓
Consistency Validator
  ↓
Time Normalizer
  ↓
Structured Result
  ↓
Offline Evaluation
```

## 3. 测试集

最终测试集：

```text
180 emails
```

覆盖场景包括：

```text
需要行动 / 无需行动
需要回复 / 无需回复
Deadline
Expected Event
相对时间
可选活动
条件性回复
模糊分类
上下文依赖时间
普通通知和负样本
```

Gold Label 在正式运行测试前固定。

## 4. Pipeline 稳定性

总测试数：

```text
180
```

成功生成可评测结果：

```text
174
```

失败：

```text
6
```

Pipeline Success Rate：

```text
96.7%
```

6 个 Pipeline Failure 在最终 Release 判断中单独记录，不视为正确结果。

## 5. Action Detection

成功进入 evaluator 的 174 条结果：

| 指标 | 结果 |
|---|---:|
| TP | 114 |
| FN | 0 |
| FP | 3 |
| TN | 57 |
| Recall | 100.0% |
| Precision | 97.4% |
| FN Rate | 0.0% |

Action Detection 是当前系统表现最稳定的模块之一。

需要注意：

以上指标基于成功进入 evaluator 的 174 条结果。

如果将 Pipeline Failure 也计算为完整系统失败，则端到端 Action Recall 会低于 100%。

## 6. Reply Detection

| 指标 | 结果 |
|---|---:|
| Recall | 75.0% |
| Precision | 90.9% |
| FN Rate | 25.0% |
| FP Rate | 2.2% |

主要错误集中在：

```text
发送邮件附件
```

与：

```text
回复邮件
```

之间的定义边界。

例如：

```text
Please email me your latest CV.
```

模型通常可以识别：

```text
requires_action = true
action.type = send
```

但不一定判断：

```text
requires_reply = true
```

这是 RC1 当前比较明显的语义弱点。

## 7. Deadline

| 指标 | 结果 |
|---|---:|
| Detection Recall | 95.3% |
| Detection Precision | 92.4% |
| Date Accuracy | 100.0% |
| Precision Accuracy | 83.6% |
| Exact Normalized Accuracy | 83.6% |

最重要的结果：

> 成功识别出的 Deadline，其日历日期准确率达到 100%。

目前主要问题不是日期计算错误，而是 LLM 偶尔丢失时间粒度。

例如原文：

```text
tomorrow at 10 AM
```

模型有时只提取：

```text
tomorrow
```

因此 Time Normalizer 可以计算正确日期，但无法恢复 10 AM。

## 8. Semantic Understanding

| 指标 | 结果 |
|---|---:|
| Category Strict Accuracy | 85.6% |
| Category Tolerant Accuracy | 98.3% |
| Importance Exact Accuracy | 86.2% |
| Importance Soft Score | 93.1% |
| Action Type E2E Accuracy | 91.2% |

Category 使用两种评价方式：

```text
Preferred Category
Acceptable Categories
```

原因是部分邮件本身存在领域分类模糊性。

例如 Research Assistant Opportunity 同时具有：

```text
career
research
```

属性。

因此 Tolerant Accuracy 更接近实际产品场景。

## 9. Expected Event

| 指标 | 结果 |
|---|---:|
| Detection Recall | 94.0% |
| Detection Precision | 98.9% |
| Date Accuracy | 90.5% |
| Precision Accuracy | 81.0% |
| Context-safe Rate | 100.0% |

上下文依赖样本：

```text
10
```

安全处理：

```text
10 / 10
```

例如：

```text
one day before the interview
```

在没有 interview 绝对日期时，系统不会生成虚假日期。

## 10. Risk-weighted Score

Matched-output Risk-weighted Score：

```text
94.2%
```

该指标不是通用模型 Accuracy，而是根据 Mailmate 产品风险设计的综合诊断指标。

重点关注：

```text
Action Recall
Reply Recall
Deadline Recall
Deadline Date Accuracy
```

## 11. 已知问题

### Pipeline Failure

180 条中有 6 条没有进入最终 evaluator。

这些失败主要集中在 Scholarship 类邮件。

说明严格 Schema Validation 在部分情况下可能将局部字段错误放大为完整 Pipeline Failure。

### Conditional Reply

例如：

```text
Please let me know only if the new time does not work for you.
```

模型有时会直接判断：

```text
requires_reply = true
```

而产品定义要求只有条件已经成立时才属于当前任务。

### Time Precision

部分邮件能够正确识别日期，但会丢失：

```text
小时
分钟
时间范围
```

因此 Date Accuracy 高于 Exact Time Accuracy。

## 12. Release Gate

RC1 最终状态：

# CONDITIONAL PASS

已经表现稳定的部分：

```text
Action Detection
Action Precision
Deadline Date Accuracy
Category Tolerant Accuracy
Expected Event Detection
Context-dependent Safety
```

仍存在明显改进空间的部分：

```text
Pipeline Stability
Reply Recall
细粒度时间信息
真实用户环境验证
```

## 13. 最终结论

Mailmate RC1 已完成：

```text
邮件接入
↓
LLM 语义理解
↓
结构化输出
↓
确定性时间推理
↓
一致性校验
↓
Gold Dataset
↓
Offline Evaluation
↓
Release Gate
```

当前版本定位为：

```text
Technical MVP / RC1
```

系统已经形成完整、可运行、可评测的 AI 邮件处理 Pipeline，同时保留了明确的已知限制。