# AGENTS.md - mnx-agent

> 本文档为 AI 助手提供项目约束和原则。详细参考见 @docs/AGENTS.md

---

## 0. 协作语言（非常重要 铁律）

1. AI助手/Agent/模型在和用户沟通时，**必须使用简体中文**
2. 所有文档（AGENTS.md、README、docs文档、代码注释等），**必须使用简体中文**

## 1. 项目定位

MiniMax AI API 工具集，提供文本、语音、图像、音乐、视频生成能力，并内置 cron 定时任务调度系统。

**技术栈：**
- 后端: Express + TypeScript + PostgreSQL + node-cron + WebSocket + pino
- 前端: React 18 + TypeScript + Tailwind CSS + Zustand + React Router

---

## 2. 架构分层

```
Frontend (React)  →  API Layer  →  Backend (Express)
                                          ↓
                               Routes → Domain Services
                                          ↓
                               Repositories → Database
```

**约束：**
- Route → Domain Service → Repository（单向依赖）
- Repository 禁止包含业务逻辑
- 循环依赖禁止

---

## 3. 命名规范

| 类型 | 约定 | 示例 |
|------|------|------|
| 接口/类型 | PascalCase | `MediaRecord`, `MediaType` |
| 函数 | camelCase | `getMediaById()` |
| 常量 | SCREAMING_SNAKE_CASE | `MEDIA_ROOT` |
| 文件名 | kebab-case | `media-service.ts` |
| 路由 | kebab-case | `/api/media-records` |

路径别名：`@/*` → `./src/*`

---

## 4. 编码约束

### 4.1 TypeScript

```json
{ "compilerOptions": { "strict": true } }
```

**禁止：** `any`、`@ts-ignore`、`as SomeType` 类型断言

### 4.2 时间处理

**存入数据库** → 使用 `toLocalISODateString()`（无 Z 后缀）

```typescript
import { toLocalISODateString } from '@/lib/date-utils.js'
const now = toLocalISODateString()
```

**例外**（可用 `toISOString()`）：外部 API 调用、WebSocket 时间戳、日志

### 4.3 错误处理

所有路由处理器必须用 `asyncHandler` 包装。

**响应格式：**
```typescript
{ success: true, data: {...} }
{ success: false, error: "错误信息" }
```

### 4.4 React 组件

- 单文件行数上限：300 行
- 使用 `cva` 处理变体，`cn()` 合并类名
- Zustand Store 按领域拆分，不混合 UI 状态

---

## 5. 数据库约束

### 5.1 表结构

必含字段：`id` (VARCHAR(36) UUID)、`created_at`、`updated_at`、`deleted_at`、`owner_id`

软删除：`is_deleted` BOOLEAN + `deleted_at`，查询自动过滤 `WHERE is_deleted = false`

### 5.2 Migration

文件：`migration_{NNN}_{description}.ts`，编号连续递增。

---

## 6. API 约束

- 所有 `/api/*` 需要 JWT Bearer token（`/api/auth` 除外）
- 路由用复数名词：`/api/cron-jobs`（不是 `/api/cron-job`）
- 数据隔离：`owner_id` 过滤

---

## 7. 安全约束

- 输入验证：Zod schema 第一道防线
- SQL 注入防护：参数化查询（`$1` 占位符）
- 禁止在日志中记录 token/password/API Key
- 审计日志：POST/PUT/PATCH/DELETE 自动记录

---

## 8. 测试约束

详见 @docs/standards/testing-standards.md 和 @docs/guides/testing-guide.md。核心要求：
- 文件位置：`server/**/*.test.ts`、`src/**/*.test.{ts,tsx}`
- Mock 外部依赖（MiniMax API）
- 覆盖率：后端硬阈值 ≥ 80%，前端目标 > 70%（运行 `npm run test:coverage` 验证）

---

## 9. 禁止清单

1. **类型安全**：禁止 `any`、`@ts-ignore`、`as any`
2. **Repository**：禁止包含业务逻辑
3. **循环依赖**：禁止循环引用模块
4. **空 catch**：禁止 `catch(e) {}` 空块
5. **敏感信息**：禁止记录 token/password
6. **非参数化 SQL**：禁止字符串拼接 SQL

---

## 10. 文档索引

| 文档类型 | 路径 |
|----------|------|
| 编码规范 | @docs/standards/coding-standards.md |
| API 设计 | @docs/standards/api-design-standards.md |
| 数据库规范 | @docs/standards/database-standards.md |
| 测试规范 | @docs/standards/testing-standards.md |
| 安全规范 | @docs/standards/security-standards.md |
| 发布流程 | @docs/guides/release-guide.md |
| 故障排查 | @docs/guides/troubleshooting.md |
| 架构决策 | @docs/decisions/ |
| 文档管理 | @docs/AGENTS.md |

---

## 11. 开发流程

1. **主分支开发**：直接在主分支工作，不强制功能分支
2. **Sub-agent 驱动**：复杂任务分解为独立工作单元，由 sub-agent 并行执行
3. **频繁提交**：每个工作单元完成后立即提交，`feat(scope): 简短描述`
4. **TDD**：先写测试，再实现
5. **架构决策**：遇到"为什么不用 X？"这类问题且答案不简单时，在 `docs/decisions/` 创建 ADR
6. **合并前**：`npm run build` + `npm run test:coverage` + TypeScript 无错误
