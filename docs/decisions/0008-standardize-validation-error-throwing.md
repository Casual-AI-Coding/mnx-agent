# ADR-0008：标准化路由层校验错误抛出

## 状态

已接受

---

## 背景

ADR-0006 与 ADR-0007 完成后，code-review-expert 在两次 review 中都标记了同一类 P3 问题：

> 路由层 `throw { status: 400, message: '...' }` 模式在项目中重复了 14 处（7 个文件），且 `server/routes/text/chat-request-builder.ts` 内部又重复构造 2 次 `ChatRequestBodyError`。

具体分布：

| 文件 | 出现次数 | 用途 |
|------|----------|------|
| `server/routes/voiceMgmt.ts` | 5 | 语音管理路由参数校验 |
| `server/routes/music.ts` | 3 | 音乐生成参数校验 |
| `server/routes/voice.ts` | 2 | 同步/异步语音生成参数校验 |
| `server/routes/image.ts` | 1 | 图像生成参数校验 |
| `server/routes/video.ts` | 1 | 视频生成参数校验 |
| `server/routes/videoAgent.ts` | 1 | 视频 Agent 模板校验 |
| `server/routes/files.ts` | 1 | 文件删除参数校验 |
| `server/routes/text/chat-request-builder.ts` | 2 | Chat 请求体校验（内部重复） |
| **合计** | **16** | 全部 `status: 400` |

**存在的问题**：

1. **DRY 违规**：16 处构造相同的 `{ status, message }` 形状对象
2. **类型不安全**：每处 `throw { ... }` 都是字面量对象，没有统一的类型约束
3. **可演进性差**：若未来想把校验错误改成真正的 `Error` 子类（携带 `code`、`details` 等元信息），需要修改 16 处
4. **可发现性差**：新开发者不知道项目里抛校验错误应该用哪种形式，容易风格漂移
5. **`http-error.ts` 缺独立测试**（ADR-0007 疏漏）：`pickHttpStatusCode` 等 helper 仅被 `asyncHandler.test.ts` 间接覆盖

---

## 决策

在 ADR-0007 新建的 `server/middleware/http-error.ts` 中新增 `throwValidationError(message): never` helper，作为路由层校验错误抛出的**单一权威模式**。

### 新增 API

```typescript
// server/middleware/http-error.ts（扩展）
export interface HttpValidationError {
  readonly status: 400
  readonly message: string
}

export function throwValidationError(message: string): never {
  const error: HttpValidationError = { status: 400, message }
  throw error
}

export function isHttpValidationError(error: unknown): error is HttpValidationError {
  // 类型守卫，供 catch 块区分校验失败与其他异常
}
```

### 替换规则

**全部 16 处** `throw { status: 400, message: '...' }` 替换为 `throwValidationError('...')`。

`throwValidationError` 返回 `never`，TypeScript 流分析受益（throw 后的代码被视为 unreachable）。

### 考虑过的替代方案

| 方案 | 决策 | 理由 |
|------|------|------|
| ❌ 引入真正的 `ValidationError extends Error` 子类 | 否决 | 与项目既有「throw 普通对象」约定冲突，需要同步改 `asyncHandler`/`handleApiError` 的形状判断；ADR-0007 已经用 `pickHttpStatusCode` 兼容了纯对象模式，本次继续沿用 |
| ❌ 把 `ChatRequestBodyError` 类型也移到 `http-error.ts` | 否决 | route-scoped 类型应留在 route 模块；只迁移「构造 + 抛出」动作，保留 route 内的类型守卫 |
| ❌ 引入 Zod schema + `validate` 中间件统一校验 | 推迟 | 收益大但改动面更广（需为每个路由定义 schema），不属于本 ADR 范围 |
| ✅ 提取 `throwValidationError` helper 到 `http-error.ts` | **采纳** | 改动最小、收益清晰、向后兼容、未来易于升级到 `Error` 子类 |

---

## 后果

### 正面影响

- **消除 16 处重复**：DRY 违规清零
- **类型安全**：`throwValidationError` 返回 `never`，TS 流分析正确推导 unreachable 代码
- **可演进**：未来若要改为 `Error` 子类，只需修改 `throwValidationError` 一处
- **可发现性**：新开发者通过 helper 名称即可理解语义
- **补齐 http-error.ts 单测**：ADR-0007 疏漏的独立单元测试本次补全

### 负面影响

- 8 个路由文件需要修改 import：从无 import 改为 `import { throwValidationError } from '../middleware/http-error.js'`
- 增加路由层对 `middleware/` 的依赖（但 routes 已经依赖 `asyncHandler`/`handleApiError`，方向一致）

### 风险

- **低风险**：每处替换都是机械操作，行为完全等价（`throw { status: 400, message }` 与 `throwValidationError(msg)` 抛出对象形状一致）
- **回归风险**：被现有 `routes/__tests__/`、`asyncHandler.test.ts`、`error-handler.test.ts`、`http-error.test.ts`（本次新增）覆盖

---

## 实施计划

### Phase A：扩展 `http-error.ts`（TDD）

1. **RED**：新建 `server/middleware/__tests__/http-error.test.ts`，覆盖：
   - `pickHttpStatusCode` / `pickHttpErrorMessage` / `pickHttpErrorStack` / `toErrorInstance`（既有 helper 的独立单测，补 ADR-0007 疏漏）
   - `throwValidationError`：抛出对象形状正确、`status` 固定为 400、`message` 透传
   - `isHttpValidationError`：识别正确形状、拒绝错误形状
2. **GREEN**：扩展 `http-error.ts` 添加 `HttpValidationError` interface + `throwValidationError` + `isHttpValidationError`
3. **commit**：`feat(middleware): 扩展 http-error 添加 throwValidationError helper + 补独立单测`

### Phase B：替换 16 处调用

1. `chat-request-builder.ts` 2 处（内部重复构造）
2. `image.ts` / `voice.ts` × 2 / `voiceMgmt.ts` × 5 / `music.ts` × 3 / `video.ts` / `videoAgent.ts` / `files.ts` 共 14 处
3. **验证**：`npm run test:coverage` + `tsc --noEmit`
4. **commit**：`refactor(routes): 16 处 throw {status:400,message} 改用 throwValidationError helper`

---

## 元数据

| 字段 | 值 |
|------|-----|
| 日期 | 2026-07-23 |
| 状态 | 已接受 |
| 决策者 | 自主推进（用户授权） |
| 关联 ADR | ADR-0006（DI 类型化与路由配置集中化）、ADR-0007（followup 死代码/错误状态/Store error） |
| 关联 review | ADR-0006 review P3（throwValidationError helper）、ADR-0007 review P2（http-error.ts 缺独立测试） |
