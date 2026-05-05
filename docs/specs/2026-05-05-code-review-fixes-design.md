# 代码审查问题修复 - 设计文档

> **日期:** 2026-05-05
> **来源:** `docs/scan/2026-05-05-auto-code-review.md`
> **范围:** P0-P3 全部 10 项改进

## 1. P0: 敏感字段加密（W1）

### 现状

`server/services/settings-service.ts` 中第 133 行定义了 `ENCRYPTED_FIELDS = ['minimaxKey', 'webhookSecret']`，但第 196 行的加密逻辑标注为 TODO，API Key 等敏感配置以明文存储在 PostgreSQL `user_settings.settings_json` 列中。

### 设计方案

**加密算法**: AES-256-GCM
- 认证加密（同时提供机密性和完整性）
- 内置 IV（nonce），无需额外管理
- Node.js `crypto` 原生支持，零外部依赖

**密钥管理**:
- 加密密钥从环境变量 `SETTINGS_ENCRYPTION_KEY` 读取（64 字符 hex）
- 启动时验证密钥存在且有效（32 字节）
- 若密钥不存在 -> 优雅降级：记录警告日志，明文存储

**加密时机**:
- `updateSettings()` -> 写入前加密 `ENCRYPTED_FIELDS` 中的字段
- `getAllSettings()` / `getSettingsByCategory()` -> 返回前解密

**格式**: 加密后的值使用 `enc:{base64Nonce}:{base64Ciphertext}:{base64AuthTag}` 格式存储，可通过前缀识别已加密值，方便数据迁移和平滑升级。

**审计日志处理**:
- `settings_history.old_value/new_value` 改为在写入历史前就加密，统一使用同一密钥

**新增文件**:
- `server/lib/crypto.ts` - 加密/解密工具函数

### 数据迁移

对于已有明文数据，提供一次性迁移逻辑：启动时检测 `settings_json` 中是否包含明文敏感值，若有则自动加密并更新。

---

## 2. P1: 安全配置加固（W2 + W3 + W5 + W7）

### W2: Body Limit 分级

**现状**: `express.json({ limit: '50mb' })` 全局应用于所有路由。

**设计**: 使用路由级别中间件，不同端点不同限制：
- 默认（普通 API）: 1MB
- 文件上传（media upload）: 50MB（保持现有）
- 通过自定义中间件 `bodyLimit(mb)` 实现

### W3: CSP 启用

**现状**: `helmet({ contentSecurityPolicy: false })`。

**设计**: 启用 CSP，使用 report-only 模式起步，逐步收紧：
```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:;
connect-src 'self' wss: http://localhost:*;
media-src 'self' blob:;
font-src 'self';
report-uri /api/csp-report;
```

### W5: Media 下载端点安全

**现状**: `/api/media/:id/download` 跳过 JWT 认证，依赖 URL query parameter 中的 `token`。

**设计**: 保持现有 mediaToken 机制（独立于 JWT），但增加：
- Token 有效期限制（默认 24 小时）
- 单次使用可选（`oneTime` 标志）
- 在 `verifyMediaToken()` 中验证 token 创建时间和使用次数

### W7: CORS 从环境变量读取

**现状**: `server/config/index.ts` 已解析 `CORS_ORIGINS`，但 `server/index.ts` 未使用。

**设计**: `server/index.ts` 改为从 `getConfig().server.corsOrigins` 读取，删除硬编码列表。

---

## 3. P2: 大文件拆分

### P2-A: 前端组件拆分（S1）

**目标**: 将 14 个超 300 行的前端文件全部拆分至 300 行以内。

**设计原则**:
- 按功能边界拆分，不是机械切分
- 子组件放在对应页面目录下的 `components/` 子目录
- 共享组件放在 `src/components/` 对应领域目录
- 不改变现有组件的外部接口（props/事件保持兼容）

**三大核心组件拆分**:

#### ImageGeneration.tsx (1258行 -> 拆分为 5 个文件)

```
pages/
├── ImageGeneration.tsx           (~200行, 主组件: 状态+布局)
└── image-generation/
    ├── ImagePromptCard.tsx        (~110行, 提示词输入)
    ├── ImageReferenceUpload.tsx   (~180行, 参考图片上传)
    ├── ImageParametersCard.tsx    (~250行, 参数配置)
    └── ImageResultsPanel.tsx      (~280行, 结果展示)
```

#### MusicGeneration.tsx (1093行 -> 拆分为 5 个文件)

```
pages/
├── MusicGeneration.tsx           (~200行, 主组件: 状态+布局)
└── music-generation/
    ├── LyricsEditorCard.tsx       (~200行, 歌词编辑)
    ├── StylePromptCard.tsx        (~150行, 风格描述)
    ├── MusicSettingsCard.tsx      (~150行, 参数配置)
    └── MusicCoverSettings.tsx     (~200行, 翻唱设置)
```

#### TestRunPanel.tsx (834行 -> 拆分为 4 个文件)

```
components/workflow/
├── TestRunPanel.tsx              (~250行, 主面板)
├── ProgressBar.tsx               (~50行, -> 移至 components/ui/)
├── ExecutionSummary.tsx          (~120行)
└── NodeResultItem.tsx            (~220行)
```

### P2-B: 后端文件拆分（S5 + S6）

#### minimax.ts (634行 -> 拆分为 10 个文件)

```
lib/minimax/
├── types.ts              (~30行, 错误类型定义)
├── client.ts             (~300行, MiniMaxClient 基类)
├── mock-client.ts        (~50行, MockMiniMaxClient)
├── factory.ts            (~40行, 单例工厂函数)
├── index.ts              (~30行, 统一导出)
├── text.ts               (~80行, chatCompletion, chatCompletionStream)
├── voice.ts              (~80行, textToAudio*)
├── image.ts              (~50行, imageGeneration)
├── music.ts              (~90行, musicGeneration, lyrics*, preprocess)
├── video.ts              (~100行, videoGeneration*, videoAgent*)
├── files.ts              (~80行, fileList/Upload/Retrieve/Delete)
├── voice-mgmt.ts         (~80行, voiceList/Delete/Clone/Design)
└── user.ts               (~60行, getBalance, getCodingPlanRemains)
```

架构模式：client.ts 中的 `MiniMaxClient` 类保持完整，其他文件通过 `Partial<MiniMaxClient>` 或 Mixin 模式挂载方法。推荐使用 **module augmentation** 方式（在不同文件中 `prototype` 扩展）或简单的 **函数导出 + 组合** 方式。考虑到下游 21 个文件通过 `minimax-client-factory.ts` 访问，采用 **具名导出 + 统一 barrel export** 模式，对外接口不变。

#### service-async.ts (1090行 -> 拆分为 8 个领域 Service)

```
database/
├── database-service.ts           (~150行, 基类: 连接池+Repository初始化)
├── index.ts                      (~20行, 单例导出)
└── services/
    ├── index.ts                  (统一导出)
    ├── job-service.ts            (~100行, Cron Jobs + Tags + Dependencies)
    ├── task-service.ts           (~220行, Task Queue CRUD)
    ├── log-service.ts            (~120行, Execution Logs + Audit Logs + External API Logs)
    ├── workflow-service.ts       (~300行, Workflow Templates + Versions + Permissions)
    ├── media-service.ts          (~120行, Media Records)
    ├── dlq-service.ts            (~60行, Dead Letter Queue)
    ├── material-service.ts       (~100行, Materials + Items)
    └── system-service.ts         (~200行, Capacity + Webhooks + System Config + Prompts)
```

---

## 4. P3: 工程改进

### P3-A: CORS 配置改为环境变量读取（S7）

一行改动：`server/index.ts` 中 `cors({ origin: [...] })` 改为 `cors({ origin: getConfig().server.corsOrigins })`。

### P3-B: API 版本前缀（S8）

**设计**: 在 `server/index.ts` 中添加 `/api/v1` 前缀路由，同时保留 `/api` 前缀以兼容现有客户端，通过 Express Router 挂载而非修改每个路由文件：

```typescript
// 版本化路由
app.use('/api/v1', apiRouter)
// 向后兼容（标记为 deprecated）
app.use('/api', apiRouter)
```

不需要修改任何路由文件内容，只需在 `server/index.ts` 中添加一行。

### P3-C: Repository 层提取动态 UPDATE 工具（S6 附加）

**设计**: 在 `server/repositories/base-repository.ts` 中提取通用方法：

```typescript
abstract class BaseRepository {
  protected async dynamicUpdate(
    table: string,
    id: string,
    fields: Record<string, unknown>,
    allowedFields: string[]  // 白名单
  ): Promise<void>
}
```

现有的 21 处 `UPDATE ... SET ${fields.join(', ')}` 逐步迁移到使用此方法，每次迁移一个 Repository。

---

## 5. 执行策略

分 4 批执行，每批内可并行（但实际由 sub-agent 按顺序执行以保证质量）：

| 批次 | 内容 | 预估文件数 | 预估工时 |
|------|------|-----------|----------|
| A 批 | P0(加密) + P1(安全配置+CSP+CORS+日志) | ~8 | 7h |
| B 批 | P2 前端组件拆分（14 个文件） | ~30 | 8h |
| C 批 | P2 后端文件拆分（minimax + service-async） | ~20 | 7h |
| D 批 | P3 工程改进（CORS env + API 版本 + Repository 工具） | ~5 | 4.5h |

每批完成后运行 `npm run build` + `npm run test:coverage` 验证。

---

## 6. 风险与注意事项

1. **加密密钥丢失** -> 所有加密数据不可恢复。需在文档中强调密钥备份。
2. **数据迁移回滚** -> 如果在迁移过程中失败，需保留原始明文数据。实现时先备份再写。
3. **组件拆分兼容性** -> 不改变任何 props 接口，对外部调用者完全透明。
4. **minimax.ts 拆分** -> 需确保 `minimax-client-factory.ts` 的导入路径保持兼容。
5. **service-async.ts 拆分** -> 57 个下游文件，需逐步迁移导入路径，每步验证。

*Reviewed by Sisyphus — 2026-05-05*
