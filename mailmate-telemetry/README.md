# Mailmate 遥测服务（Cloudflare Worker + D1）

此服务接收 Mailmate 扩展的去标识使用计数和技术诊断，不接收邮件正文、主题、发件人、邮件 ID、API Key 或模型成功生成的摘要/行动原文。扩展默认开启遥测；用户可在面板中取消勾选。当前扩展已连接到 `https://mailmate-telemetry.mailmate-telemetry-261117.workers.dev/v1/events`。

## 收集内容

- 活跃情况：随机安装标识（可关联同一扩展安装实例，但不包含真实姓名或邮箱）、收到事件的时间、分析开始及任务勾选活动。
- 使用情况：近两周扫描数、新分析数、缓存命中、跳过/失败数、任务行动总数与插件内勾选完成数。
- Groq 诊断：HTTP 状态、错误码/类型/经过截短和基本脱敏的错误消息、请求 ID、模型名、请求耗时、Token 用量、响应字符数和解析/结构校验失败类别。
- 客户端问题：有限的错误阶段和错误类别，不采集 JavaScript 堆栈或邮件页面内容。

成功模型响应只记录模型、Token、耗时和字符数，不记录响应文本。Groq 错误正文也不会整体保存，只保留有限诊断字段。

“活跃用户”在报表中按最近 1/7/30 天的活跃安装实例估算；同一人换浏览器可能计作多个实例，一台设备多人使用可能计作一个实例。任务完成率按当前每个安装实例最近一次快照中的“已勾选行动项 / 识别出的行动项”计算，表示插件勾选率，不代表现实中确已完成。

诊断事件最多保存 30 天，安装实例及最近一次行动计数最多保存 90 天，Worker 的每日 Cron 会清理过期数据。Cloudflare 仍可能按其服务条款处理网络层请求元数据；请阅读 Cloudflare 的隐私与 D1 文档，并按目标用户所在地区的隐私要求配置服务。

## 部署到 Cloudflare

需要一个 Cloudflare 账号以及本机 Node.js / npm。Cloudflare 官方建议使用 Wrangler CLI 管理 Worker 与 D1，见 [D1 入门](https://developers.cloudflare.com/d1/get-started/)、[Wrangler D1 命令](https://developers.cloudflare.com/d1/wrangler-commands/) 和 [Workers 部署命令](https://developers.cloudflare.com/workers/wrangler/commands/workers/)。

在此目录打开 PowerShell：

1. 登录 Cloudflare：

   ```powershell
   npx wrangler@latest login
   ```

2. 创建 D1 数据库：

   ```powershell
   npx wrangler@latest d1 create mailmate-telemetry
   ```

   将命令输出的数据库 ID 填入 `wrangler.toml` 的 `database_id`，替换 `REPLACE_WITH_D1_DATABASE_ID`。

3. 应用数据库迁移：

   ```powershell
   npx wrangler@latest d1 migrations apply mailmate-telemetry --remote
   ```

4. 设置管理员口令：

   ```powershell
   npx wrangler@latest secret put ADMIN_TOKEN
   ```

   输入一段独立的高强度随机口令。它只用于管理员读取统计，不要写入扩展或 GitHub。

5. 部署 Worker：

   ```powershell
   npx wrangler@latest deploy
   ```

Wrangler 会输出 Worker URL。当前公开扩展包已经配置了上述 Mailmate Worker。若要改用你自己的 Worker，请将 `/v1/events` 地址写入 `mailmate-outlook-mvp/telemetry-config.js`，并把对应域名加入 `mailmate-outlook-mvp/manifest.json` 的 `host_permissions`，然后重新生成安装包；普通用户无需修改源码。

## 查看指标和错误日志

当前数据看板入口：[打开 Mailmate 使用数据看板](https://mailmate-telemetry.mailmate-telemetry-261117.workers.dev/admin)。输入部署时设置的 `ADMIN_TOKEN` 后，可查看近 24 小时 / 7 天 / 30 天匿名活跃安装、分析次数、行动勾选率、Groq 错误分组、客户端错误类别和模型 Token 用量。管理员口令只保留在页面内存中，不会写入浏览器存储。

`/v1/admin/summary` 受管理员口令保护。扩展写入事件的 `/v1/events` 不需要嵌入共享密钥，因此任何人都可能伪造匿名统计；这些数据适合判断趋势，不适合作为计费或审计依据。
