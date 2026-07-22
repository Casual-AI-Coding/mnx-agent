# ADR-0012：AI 路由引入 Zod Schema 校验（Phase A：image / voice）

## 状态

已接受

---

## 背景

`server/routes/` 下的 AI 路由在 ADR-0006 ~ ADR-0008 之前一直依赖「手写校验 + `throw { status: 400, message }`」模式。
ADR-0008 已将这种抛错统一为 `throwValidationError()` helper，解决了**抛出端**的一致性问题，但**校验端**仍然存在以下问题：

1. **校验逻辑与业务耦合**：每个路由手写 `if (!req.body.prompt) throwValidationError('prompt is required')`，校验、默认值填充、错误抛出三件事混在一个 buildRequestBody 闭包中。
2. **类型与运行时 schema 割裂**：`ImageGenerateBody` interface 是 TypeScript 编译期类型，运行时无任何守护；客户端传入 `{ prompt: 123 }` 时类型检查通过但运行时崩溃。
3. **错误信息不一致**：手写校验只能给出 `prompt is required` 这类粗粒度错误，无法指出「第 N 个字段类型错误」或「枚举值不合法」等结构性错误。
4. **默认值散落**：`model: req.body.model ?? 'image-01'` 这种默认值填充逻辑分散在各路由。
5. **schema 不可前后端共享**：前端 form 校验需独立实现，与后端校验规则容易漂移。

而项目其实**早已具备 zod schema 校验的基础设施**：

- `server/middleware/validate.ts` 提供 `validate / validateQuery / validateParams` 中间件工厂
- `server/validation/` 目录已有 12+ 领域 schema（audit/cron/material/media/workflow 等）
- `packages/shared-types/entities/` 已有 zod schema 范例（`lyrics.ts` 同时导出 interface + zod schema + `z.infer` 类型，前后端共享）
- 部分路由早已用 zod（invitation-codes / external-proxy / admin/announcements / users / auth / system-config / lyrics 等）

但**仍有 7 个 AI 路由未迁移到 zod**：text / image / voice / music / video / videoAgent / voiceMgmt。
其中 text 已由 ADR-0006 的 `chat-request-builder` 处理；本 ADR 聚焦 **image / voice** 两个最简单的试点，验证模式可行性后再推广到 music/video/videoAgent/voiceMgmt。

---

## 决策

**采纳**：为 image / voice 路由创建 zod schema，放在 `packages/shared-types/entities/`，路由层用 `validate(schema)` 中间件替代手写校验。

### 范围

- ✅ **本 ADR 完成**：image.ts（1 个端点）+ voice.ts（2 个端点：sync / async）
- ⏳ **留给未来 ADR**：music / video / videoAgent / voiceMgmt / text（text 已由 chat-request-builder 处理）

### Schema 风格（跟随 `lyrics.ts` 范式）

每个 AI 模态在 `packages/shared-types/entities/` 下新建一个文件，导出三件套：

```typescript
// 1. interface（请求体形状定义，供参考与文档）
export interface ImageGenerateBody { ... }

// 2. zod schema（运行时校验，含默认值、类型约束、refine 跨字段校验）
export const imageGenerateSchema = z.object({ ... })

// 3. type（从 schema 推断，供路由层 buildRequestBody 使用）
export type ImageGenerateInput = z.infer<typeof imageGenerateSchema>
```

### 路由层用法

```typescript
import { validate } from '@/middleware/validate.js'
import { imageGenerateSchema, type ImageGenerateInput } from '@mnx/shared-types/entities'

router.post('/generate',
  authenticateJWT,
  validate(imageGenerateSchema),  // ← 校验 + 默认值填充 + 类型 narrowing
  createApiProxyRouter<...>({
    endpoint: '/image/generation',
    buildRequestBody: (req) => req.body as ImageGenerateInput,  // ← validate 已写入合法值
  })
)
```

### 考虑过的替代方案

| 方案 | 评价 | 结论 |
|------|------|------|
| ❌ 全部 7 个 AI 路由一次性迁移 | 上下文消耗过大，风险集中 | 否决，分 ADR 推进 |
| ❌ schema 放 `server/validation/` 而非 `packages/shared-types/entities/` | 仅服务端用，但前端 form 校验未来也会需要 schema；lyrics.ts 范式证明 shared-types 路径可行 | 否决，跟随既有范式 |
| ❌ 引入 `express-validator` 替代 zod | 项目其他模块已用 zod，引入新依赖增加心智负担 | 否决 |
| ❌ 不做，保留 throwValidationError 模式 | 校验/默认值/错误信息三件事仍然耦合 | 否决，机会成本太高 |
| ✅ 分 ADR 推进，image/voice 试点 | 改动小、可验证、模式确立后再推广 | **采纳** |

---

## 后果

### 正面影响

1. **校验与业务解耦**：`validate(schema)` 中间件负责校验和默认值填充，buildRequestBody 只关心字段映射
2. **类型与运行时统一**：`z.infer<typeof schema>` 让 TypeScript 类型成为 schema 的投影，编译期和运行时不再漂移
3. **错误信息结构化**：zod 自动返回 `{ path: ['prompt'], code: 'invalid_type', message: 'Required' }`，前端可定位到具体字段
4. **前后端 schema 共享**：前端 form 校验可直接 import 同一份 schema，杜绝规则漂移
5. **默认值集中化**：`.default('image-01')` 让默认值定义在 schema 中，不再散落于各路由
6. **试点验证可行性**：image/voice 成功后，music/video/videoAgent/voiceMgmt 可按相同模式快速复制

### 负面影响

1. **新增 shared-types build 步骤依赖**：schema 文件改动需 `npm run build` 重新生成 dist（开发时 vitest alias 指向 source 可绕过）
2. **alias 配置 latent bug 暴露**：`vitest.server.config.ts` 的 `@mnx/shared-types/(.+)` alias 把深层路径映射到 `dist/$1/index.js`（实际是 `dist/$1.js`），image/voice 是首个被单测直接 import 的深层路径；本次通过改用顶层 entry `@mnx/shared-types/entities` 绕过（与项目其他文件统一模式），alias 本身的修复留作独立 issue
3. **学习成本**：zod 语法对新人需要学习曲线（但项目其他模块早已用 zod，无新依赖）

### 风险

1. **Phase A 模式不被后续 ADR 推广**：若 music/video 等路由的请求体含复杂嵌套（如 video 的 `subtitles: { text: string, position: 'top'|'bottom' }`），schema 可能变得冗长
   - 缓解：zod 支持 `.refine()` 处理跨字段校验、`.discriminatedUnion()` 处理多形态请求，模式可扩展
2. **前端 import 路径漂移**：前端 form 校验未来引用 schema 时，必须用顶层 entry（与本次路由一致），否则触发同样的 alias bug
   - 缓解：ADR 显式记录此约束

---

## 元数据

| 字段 | 值 |
|------|-----|
| 日期 | 2026-07-23 |
| 状态 | 已接受 |
| 决策者 | Sisyphus（自主推进） |
| 审阅者 | 待 code-review-expert 评审 |
| 相关 ADR | ADR-0006（DI 类型化与路由配置集中化）、ADR-0008（标准化校验错误抛出） |
| 后续 ADR | music/video/videoAgent/voiceMgmt 的 zod schema 迁移 |
