# R-002 Phase 1 素材管理实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 按任务执行。步骤使用 checkbox（`- [ ]`）跟踪。

**Goal:** 交付 Phase 1 素材管理能力，支持 `音乐人` 作为首个顶层素材类型，并支持主实体、子实体与独立通用 Prompt 的管理。

**Architecture:** 后端采用“通用素材主表 + 通用素材子表 + 独立通用 Prompt 表”的三层结构，使用 service / repository 分层落地；前端采用共享资源管理容器与 `音乐人` 专属 2×2 编辑工作台。Prompt 不从属于素材域命名，而是通过 `target_type + target_id + slot_type` 作为跨场景通用能力挂载到不同对象。

**Tech Stack:** Express、TypeScript、PostgreSQL、Zod、Vitest、React 18、Zustand、React Router、Tailwind CSS

---

## 1. 文件结构与职责

### 1.1 文档
- Create: `docs/specs/2026-04-23-r-002-resource-management-design.md`
- Create: `docs/plans/2026-04-23-r-002-resource-management-phase-1.md`

### 1.2 后端数据库与类型
- Modify: `server/database/schema-pg.ts` — 新增素材主表、素材子表、通用 Prompt 表定义
- Modify: `server/database/types.ts` — 补充数据库记录类型
- Create: `server/database/migrations/migration_0NN_resource_management_phase_1.ts` — 迁移脚本，实际 NN 取当前连续编号

### 1.3 Repository
- Create: `server/repositories/material-repository.ts`
- Create: `server/repositories/material-item-repository.ts`
- Create: `server/repositories/prompt-repository.ts`
- Create: `server/repositories/__tests__/material-repository.test.ts`
- Create: `server/repositories/__tests__/material-item-repository.test.ts`
- Create: `server/repositories/__tests__/prompt-repository.test.ts`

### 1.4 Service / Route / Validation
- Create: `server/services/domain/material.service.ts`
- Create: `server/routes/materials.ts`
- Create: `server/routes/prompts.ts`
- Create: `server/validation/material-schemas.ts`
- Create: `server/validation/prompt-schemas.ts`
- Modify: `server/service-registration.js`
- Create: `server/routes/__tests__/materials.test.ts`
- Create: `server/routes/__tests__/prompts.test.ts`

### 1.5 前端 API / 类型 / Store / 页面
- Create: `src/types/material.ts`
- Create: `src/types/prompt.ts`
- Create: `src/lib/api/materials.ts`
- Create: `src/lib/api/prompts.ts`
- Create: `src/stores/materials.ts`
- Create: `src/components/materials/MaterialManagementLayout.tsx`
- Create: `src/components/materials/MaterialList.tsx`
- Create: `src/components/materials/artist/ArtistWorkspace.tsx`
- Create: `src/components/materials/artist/ArtistBasicInfoPanel.tsx`
- Create: `src/components/materials/artist/ArtistPromptPanel.tsx`
- Create: `src/components/materials/artist/SongLibraryPanel.tsx`
- Create: `src/components/materials/artist/SongPromptPanel.tsx`
- Create: `src/pages/MaterialManagement.tsx`
- Create: `src/pages/ArtistMaterialEditor.tsx`
- Create: `src/components/materials/__tests__/MaterialManagementLayout.test.tsx`
- Create: `src/components/materials/artist/__tests__/ArtistWorkspace.test.tsx`

---

## 2. 实施任务

### Task 1：落地正式设计文档

**Files:**
- Create: `docs/specs/2026-04-23-r-002-resource-management-design.md`

- [ ] **Step 1: 对照草稿整理正式规格结构**

需要包含以下章节：

```md
## 1. 背景与目标
## 2. 范围定义
## 3. 核心方案结论
## 4. 领域模型
## 5. 数据结构设计
## 6. API 设计
## 7. 前端页面与交互设计
## 8. 校验、约束与删除策略
## 9. 测试策略与验收标准
```

- [ ] **Step 2: 明确 Prompt 的独立通用定位**

规格文档必须写出如下结论：

```md
### 4.5 Prompt 建模结论
Prompt 不是素材域的附属表，而是独立的跨场景通用能力表。

归属通过以下维度表达：
- `target_type`
- `target_id`
- `slot_type`
```

- [ ] **Step 3: 保存文档**

Run:

```bash
test -f "docs/specs/2026-04-23-r-002-resource-management-design.md"
```

Expected: 命令退出码为 0。

- [ ] **Step 4: 自检文档中不存在旧的素材域 Prompt 命名残留**

Run:

```bash
grep -Rni "素材域 Prompt 命名\|附属 Prompt 命名" "docs/specs/2026-04-23-r-002-resource-management-design.md"
```

Expected: 无匹配结果。

### Task 2：新增数据库结构与迁移

**Files:**
- Modify: `server/database/schema-pg.ts`
- Modify: `server/database/types.ts`
- Create: `server/database/migrations/migration_0NN_resource_management_phase_1.ts`

- [ ] **Step 1: 先写失败测试，定义数据库约束行为**

```ts
it('rejects duplicate song names under the same material and item type', async () => {
  await materialItemRepository.create({
    materialId: artistId,
    itemType: 'song',
    name: 'Blue Night',
    ownerId,
  })

  await expect(
    materialItemRepository.create({
      materialId: artistId,
      itemType: 'song',
      name: 'Blue Night',
      ownerId,
    })
  ).rejects.toThrow()
})
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
npm run test -- server/repositories --runInBand -t "duplicate song names under the same material"
```

Expected: FAIL，提示缺少表、缺少约束或缺少实现。

- [ ] **Step 3: 在 schema 中定义三张表**

关键字段最少应包含：

```ts
materials: id, material_type, name, description, owner_id, sort_order,
  created_at, updated_at, is_deleted, deleted_at

material_items: id, material_id, item_type, name, lyrics, owner_id, sort_order,
  created_at, updated_at, is_deleted, deleted_at

prompts: id, target_type, target_id, slot_type, name, content, owner_id,
  sort_order, is_default, created_at, updated_at, is_deleted, deleted_at
```

- [ ] **Step 4: 添加唯一约束与索引**

至少包含：

```sql
UNIQUE (material_id, item_type, name, is_deleted)
INDEX (owner_id, material_type, is_deleted)
INDEX (material_id, item_type, is_deleted)
INDEX (target_type, target_id, slot_type, is_deleted)
```

说明：如果数据库层要避免 `is_deleted = true` 干扰，可改用更精确的部分索引或实现等价策略。

- [ ] **Step 5: 编写迁移并同步数据库类型**

Run:

```bash
npm run test -- server/database --runInBand
```

Expected: PASS。

### Task 3：实现 Repository 层

**Files:**
- Create: `server/repositories/material-repository.ts`
- Create: `server/repositories/material-item-repository.ts`
- Create: `server/repositories/prompt-repository.ts`
- Create: `server/repositories/__tests__/material-repository.test.ts`
- Create: `server/repositories/__tests__/material-item-repository.test.ts`
- Create: `server/repositories/__tests__/prompt-repository.test.ts`

- [ ] **Step 1: 先写失败测试，定义 Prompt 默认项规则**

```ts
it('keeps only one default prompt in the same target and slot', async () => {
  const first = await promptRepository.create({
    targetType: 'material-main',
    targetId: artistId,
    slotType: 'artist-style',
    name: '候选 A',
    content: 'A',
    isDefault: true,
    ownerId,
  })

  const second = await promptRepository.create({
    targetType: 'material-main',
    targetId: artistId,
    slotType: 'artist-style',
    name: '候选 B',
    content: 'B',
    isDefault: true,
    ownerId,
  })

  const prompts = await promptRepository.listByTarget({
    targetType: 'material-main',
    targetId: artistId,
    slotType: 'artist-style',
    ownerId,
  })

  expect(prompts.filter((item) => item.isDefault)).toHaveLength(1)
  expect(prompts.find((item) => item.id === second.id)?.isDefault).toBe(true)
  expect(prompts.find((item) => item.id === first.id)?.isDefault).toBe(false)
})
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
npm run test -- server/repositories --runInBand -t "keeps only one default prompt"
```

Expected: FAIL。

- [ ] **Step 3: 实现三个 Repository 的最小能力**

最少需要以下方法：

```ts
materialRepository.create / update / softDelete / list / getById
materialItemRepository.create / update / softDelete / listByMaterial / reorder
promptRepository.create / update / softDelete / listByTarget / setDefault / reorder
```

- [ ] **Step 4: 补齐软删除、owner 过滤、级联辅助测试**

Run:

```bash
npm run test -- server/repositories --runInBand
```

Expected: PASS。

### Task 4：实现 Service、Validation 与 API

**Files:**
- Create: `server/services/domain/material.service.ts`
- Create: `server/routes/materials.ts`
- Create: `server/routes/prompts.ts`
- Create: `server/validation/material-schemas.ts`
- Create: `server/validation/prompt-schemas.ts`
- Modify: `server/service-registration.js`
- Create: `server/routes/__tests__/materials.test.ts`
- Create: `server/routes/__tests__/prompts.test.ts`

- [ ] **Step 1: 先写失败测试，定义聚合详情接口契约**

```ts
it('returns artist detail with songs and prompts in one payload', async () => {
  const response = await request(app)
    .get(`/api/materials/${artistId}/detail`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200)

  expect(response.body.success).toBe(true)
  expect(response.body.data).toMatchObject({
    material: expect.objectContaining({ id: artistId, materialType: 'artist' }),
    materialPrompts: expect.any(Array),
    items: expect.any(Array),
    itemPrompts: expect.any(Array),
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
npm run test -- server/routes --runInBand -t "returns artist detail with songs and prompts"
```

Expected: FAIL。

- [ ] **Step 3: 编写 Zod schema 与 service 业务编排**

service 至少覆盖：

```ts
createMaterial / updateMaterial / deleteMaterial
createMaterialItem / updateMaterialItem / deleteMaterialItem / reorderMaterialItems
createPrompt / updatePrompt / deletePrompt / setDefaultPrompt / reorderPrompts
getMaterialDetail
```

- [ ] **Step 4: 路由接入 asyncHandler、统一响应格式与 owner 隔离**

Run:

```bash
npm run test -- server/routes --runInBand
```

Expected: PASS。

### Task 5：实现共享资源管理容器与列表页

**Files:**
- Create: `src/types/material.ts`
- Create: `src/types/prompt.ts`
- Create: `src/lib/api/materials.ts`
- Create: `src/lib/api/prompts.ts`
- Create: `src/stores/materials.ts`
- Create: `src/components/materials/MaterialManagementLayout.tsx`
- Create: `src/components/materials/MaterialList.tsx`
- Create: `src/pages/MaterialManagement.tsx`
- Create: `src/components/materials/__tests__/MaterialManagementLayout.test.tsx`

- [ ] **Step 1: 先写失败测试，定义列表页基础交互**

```tsx
it('renders material list with search and create actions', async () => {
  render(<MaterialManagement />)

  expect(await screen.findByPlaceholderText('搜索素材')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '新建素材' })).toBeInTheDocument()
  expect(await screen.findByText('音乐人')).toBeInTheDocument()
})
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
npm run test -- src/components/materials --runInBand
```

Expected: FAIL。

- [ ] **Step 3: 实现共享容器、列表组件、API 与 store**

列表至少展示：

```ts
name
materialType
itemCount
updatedAt
```

- [ ] **Step 4: 补齐搜索、筛选、删除入口测试**

Run:

```bash
npm run test -- src/components/materials --runInBand
```

Expected: PASS。

### Task 6：实现音乐人专属 2×2 编辑工作台

**Files:**
- Create: `src/components/materials/artist/ArtistWorkspace.tsx`
- Create: `src/components/materials/artist/ArtistBasicInfoPanel.tsx`
- Create: `src/components/materials/artist/ArtistPromptPanel.tsx`
- Create: `src/components/materials/artist/SongLibraryPanel.tsx`
- Create: `src/components/materials/artist/SongPromptPanel.tsx`
- Create: `src/pages/ArtistMaterialEditor.tsx`
- Create: `src/components/materials/artist/__tests__/ArtistWorkspace.test.tsx`

- [ ] **Step 1: 先写失败测试，定义 2×2 布局与联动**

```tsx
it('switches song selection and updates the song prompt panel', async () => {
  render(<ArtistWorkspace materialId="artist-1" />)

  expect(await screen.findByText('基本信息')).toBeInTheDocument()
  expect(screen.getByText('音乐人风格 Prompt')).toBeInTheDocument()
  expect(screen.getByText('歌曲库')).toBeInTheDocument()
  expect(screen.getByText('歌曲风格 Prompt')).toBeInTheDocument()

  await user.click(await screen.findByRole('button', { name: 'Blue Night' }))

  expect(await screen.findByDisplayValue('Blue Night song style')).toBeInTheDocument()
})
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
npm run test -- src/components/materials/artist --runInBand -t "switches song selection"
```

Expected: FAIL。

- [ ] **Step 3: 实现四个面板与聚合详情联动**

必须满足：

```ts
左上 = 基本信息
左下 = 音乐人风格 Prompt tabs
右上 = 歌曲库
右下 = 当前歌曲 Prompt tabs
```

- [ ] **Step 4: 补齐重复歌曲名与默认项切换测试**

Run:

```bash
npm run test -- src/components/materials/artist --runInBand
```

Expected: PASS。

### Task 7：联调、验证与收口

**Files:**
- Modify: `server/**/*.test.ts`
- Modify: `src/**/*.test.tsx`
- Modify: `package.json`（仅当脚本确有必要时）

- [ ] **Step 1: 运行后端测试**

Run:

```bash
npm run test -- server --runInBand
```

Expected: PASS。

- [ ] **Step 2: 运行前端测试**

Run:

```bash
npm run test -- src --runInBand
```

Expected: PASS。

- [ ] **Step 3: 运行构建与覆盖率验证**

Run:

```bash
npm run build && npm run test:coverage
```

Expected: 全部成功退出，并满足现有阈值。

- [ ] **Step 4: 回归检查关键流程**

关键流程必须人工可复现：

```md
1. 新建音乐人
2. 新增两首歌曲
3. 维护音乐人级 Prompt 候选
4. 维护歌曲级 Prompt 候选
5. 切换默认项
6. 删除一个非默认 Prompt
7. 刷新页面后数据保持正确
```

---

## 3. 自检清单

### 3.1 规格覆盖检查
- [ ] 覆盖主实体 / 子实体 / Prompt 三层模型
- [ ] 覆盖 `音乐人` 作为首个顶层素材类型
- [ ] 覆盖“同一音乐人下歌曲名唯一”
- [ ] 覆盖 `target_type + target_id + slot_type` 归属模型
- [ ] 覆盖 2×2 编辑器布局

### 3.2 命名一致性检查
- [ ] 文档、计划、代码路径中不再使用素材域附属命名指代通用 Prompt 能力
- [ ] 后端 Prompt 相关文件统一使用 `prompt-*` 命名
- [ ] 前端 Prompt API / 类型统一使用 `prompt` 命名

### 3.3 范围检查
- [ ] 未把模板管理纳入 Phase 1
- [ ] 未把运行时集成纳入 Phase 1
- [ ] 未把歌曲提升为顶层素材类型

---

## 4. 完成标准

- 正式设计文档已写入 `docs/specs/2026-04-23-r-002-resource-management-design.md`
- 正式实现计划已写入 `docs/plans/2026-04-23-r-002-resource-management-phase-1.md`
- 实施时不再使用素材域附属命名来描述通用 Prompt 能力
- 后续实现可直接按本文任务拆解执行
