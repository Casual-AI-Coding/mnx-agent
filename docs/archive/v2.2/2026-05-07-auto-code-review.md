# Code Review Report - mnx-agent
> Date: 2026-05-07
> Branch: main
> Total Files: 5226
> Tech Stack: Express + TypeScript + PostgreSQL + React 18 + Vite + Zustand + Tailwind CSS

## 1. 项目概览
mnx-agent 是 MiniMax AI API 工具集，提供文本、语音、图像、音乐、视频生成能力，内置 cron 定时任务调度系统。后端 Express + PostgreSQL，前端 React 18 + Vite。版本 v2.2.7，代码规模较大（5226 文件，含大量媒体资产 .png/.mp3）。

## 2. 发现的问题

### 🔴 严重（Critical）
- **脚本文件硬编码数据库密码** — `scripts/restore-media-by-size.ts:16` 中 `process.env.DB_PASSWORD || 'mnx_agent_password'`，硬编码了默认数据库密码。若 `.env` 未配置，将使用明文密码连接数据库。应在生产脚本中直接 `throw` 而非 fallback。
  - **结论**：✅ **已修复** — 改为在脚本启动时校验 `DB_PASSWORD` 环境变量，未设置则 `throw Error`

### 🟡 警告（Warning）
- **`restore-media-by-size.ts` 包含硬编码路径** — 第 5 行 `const RECOVERED_DIR = '/home/ogslp/media2'` 硬编码了绝对路径，应改为环境变量。
  - **结论**：✅ **已修复** — 改为从 `RECOVERED_DIR` 环境变量读取，未设置则 `throw Error`。同步修复了 `restore-from-home-media.ts`、`restore-from-media3.ts`、`restore-media-simple.ts` 共 4 个脚本的硬编码路径
- **scripts 中大量使用 console.log 而非 logger** — 三个数据恢复脚本均使用 `console.log`，而项目主服务使用 pino logger，应保持一致。
  - **结论**：❌ **无需处理** — 7 个脚本均为独立运行的一次性数据恢复工具，非服务常驻进程。`console.log` 对离线脚本是合理选择，引入 logger 属于过度工程化
- **helmet CSP 为 reportOnly 模式** — `server/index.ts:83` 的 CSP 设置为 `reportOnly: true`，生产环境应启用强制执行。
  - **结论**：⚠️ **需评估** — 改为强制 CSP 前需验证不破坏现有前端功能（内联脚本/CSS、CDN 资源等），非纯代码修复，需业务验证后单独处理
- **CORS 白名单默认包含 localhost** — `config/index.ts:138` 的 `parseCorsOrigins` 默认值为 `['http://localhost:3000', 'http://localhost:4511']`，生产部署需确保覆盖此配置。
  - **结论**：❌ **无需处理** — 生产部署通过 `CORS_ORIGINS` 环境变量覆盖即可，fallback 值提供开发体验便利，属配置提醒非代码 bug

### 🔵 建议（Suggestion）
- **package.json dependencies 包含 @types 包** — `@types/archiver`、`@types/multer`、`@types/ws` 放在 `dependencies` 而非 `devDependencies`。
  - **结论**：✅ **已修复** — 三个 `@types/*` 包已移至 `devDependencies`
- **devDependencies 包含 express/cors** — `express` 和 `cors` 在 `devDependencies` 中，但实际在 `server/index.ts` 中运行时引用，应归入 `dependencies`。
  - **结论**：✅ **已修复** — `express`、`cors`、`react-hook-form` 已移至 `dependencies`
- **react-hook-form 在 devDependencies** — 同上，`react-hook-form` 应归入 `dependencies`。
  - **结论**：✅ **已修复** — 随上一项一并修复
- **版本号更新频率高** — 5 个 commit 仅涉及 config/proxy/docs/test 修复，版本号却频繁更新。
  - **结论**：❌ **误报** — 版本管理策略为主观评价，非代码问题。`package.json` 当前 `version: "2.2.7"` 未频繁变动

## 3. 安全审查

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 硬编码密钥 | ✅ **已修复** | `restore-media-by-size.ts` 改为校验环境变量，未设置则 `throw` |
| 注入风险 | ✅ 安全 | 使用参数化查询 `$1` 占位符，Zod 校验 |
| 认证/授权 | ✅ 安全 | JWT Bearer token，拒绝 query parameter tokens，角色控制 `requireRole` |
| JWT Secret | ✅ 安全 | 最小 32 字符校验，fail-fast 设计 |
| CORS 配置 | ⚠️ 注意 | 默认白名单含 localhost，需确保生产覆盖 |
| CSP | ⚠️ 注意 | reportOnly 模式，生产需改为强制 |
| Rate Limiting | ✅ 安全 | 全局 + media + cron 分级限流 |
| 安全头 | ✅ 安全 | helmet 启用（CSP/帧保护等） |
| 审计日志 | ✅ 安全 | 自动记录 POST/PUT/PATCH/DELETE 操作 |

## 4. 性能分析

- 最近 commit `2d18264` 专门修复了 N+1 查询 + 连接池加固 + 复合索引，说明已在优化
- 数据库连接池配置合理（poolMax: 10, idleTimeout: 30s, connectionTimeout: 5s）
- Cron 调度 + DLQ 重试机制设计良好
- 大量媒体文件（3281 PNG + 859 MP3）需关注存储和传输效率
- 前端使用 TanStack Virtual 做虚拟列表，数据展示性能有保障

## 5. 代码规范

- 架构分层清晰：Routes → Domain Services → Repositories → Database
- AGENTS.md 规范严格（中文文档、命名规范、编码约束）
- 类型安全：禁止 any/ts-ignore，严格 TypeScript
- 软删除 + owner_id 数据隔离规范
- 34 个 migration 文件，编号连续，版本管理有序

## 6. 交互与功能

- 功能丰富：文本/语音/图像/音乐/视频生成，cron 调度，WebSocket 实时推送
- 管理后台（service-nodes/workflows/permissions）功能完善
- Webhook 事件通知机制设计合理
- 媒体文件管理和恢复脚本体现了运维意识

## 7. 总结

### 修复情况汇总

| 严重度 | 总计 | 已修复 | 无需处理 | 需评估 | 误报 |
|--------|------|--------|----------|--------|------|
| 🔴 严重 | 1 | 1 | 0 | 0 | 0 |
| 🟡 警告 | 4 | 1 | 2 | 1 | 0 |
| 🔵 建议 | 4 | 3 | 0 | 0 | 1 |
| **合计** | **9** | **5** | **2** | **1** | **1** |

### 实际修复清单
1. ✅ `restore-media-by-size.ts` 硬编码 DB 密码 → 校验 `DB_PASSWORD` 环境变量，未设置 `throw`
2. ✅ 4 个脚本硬编码路径 → 改为 `RECOVERED_DIR` / `MEDIA_DIR` 环境变量
3. ✅ `@types/archiver`、`@types/multer`、`@types/ws` → 移至 `devDependencies`
4. ✅ `express`、`cors`、`react-hook-form` → 移至 `dependencies`

### 修正后健康度评分：**8/10**
