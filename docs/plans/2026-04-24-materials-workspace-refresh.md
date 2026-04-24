# 素材管理与创作工作台刷新实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复素材工作台三个空态创建入口无弹窗的问题，并完成素材管理页、创建素材弹窗与 Artist Workspace 的视觉升级。

**Architecture:** 保持 `/materials` 与 `/materials/:id/edit` 路由、`ArtistWorkspace` 的 2x2 容器结构、共享 `Dialog` / `Card` / `Button` 组件与 Tailwind 语义 token 不变。先用 TDD 在 `ArtistWorkspace` 组合测试中写出三个空态失败用例，再以最小结构改动把三个 panel 的创建弹窗提升到共享渲染层，最后在既有组件边界内重做视觉层次与 CTA 表达，并用无头浏览器完成运行时核验。

**Tech Stack:** React 18、TypeScript、Vite、Vitest、Testing Library、Tailwind CSS、Zustand、React Router、Framer Motion、Lucide React。

---

## 文件结构与职责

- `docs/plans/2026-04-24-materials-workspace-refresh.md` - 本实现计划
- `src/components/materials/artist/__tests__/ArtistWorkspace.test.tsx` - Artist Workspace 组合测试，补三个空态创建弹窗失败用例与回归保护
- `src/components/materials/artist/ArtistPromptPanel.tsx` - 修复音乐人级 prompt 空态创建弹窗不可见问题，并做视觉升级
- `src/components/materials/artist/SongLibraryPanel.tsx` - 修复歌曲库空态创建弹窗不可见问题，并做视觉升级
- `src/components/materials/artist/SongPromptPanel.tsx` - 修复歌曲级 prompt 空态创建弹窗不可见问题，并做视觉升级
- `src/components/materials/artist/ArtistBasicInfoPanel.tsx` - 升级为更明确的“档案卡”视觉层次
- `src/components/materials/MaterialManagementLayout.tsx` - 重做素材管理页和创建素材弹窗的视觉层次与 CTA
- `src/components/materials/artist/ArtistWorkspace.tsx` - 只做必要的容器级样式微调，保持 2x2 结构和本地联动逻辑不变

---

### Task 1: 用失败测试锁定三个空态创建弹窗 bug

**Files:**
- Modify: `src/components/materials/artist/__tests__/ArtistWorkspace.test.tsx`

- [ ] **Step 1: 在 ArtistWorkspace 组合测试里新增三个失败用例**

```tsx
it('opens the create song dialog from the empty song state', async () => {
  const { getMaterialDetail } = await import('@/lib/api/materials')
  const detail = createMockMaterialDetail()
  detail.items = []
  vi.mocked(getMaterialDetail).mockResolvedValue({
    success: true,
    data: detail,
  })

  const user = userEvent.setup()
  render(<ArtistWorkspace materialId="artist-1" />)

  await user.click(await screen.findByRole('button', { name: '新建歌曲' }))

  expect(screen.getByRole('heading', { name: '新建歌曲' })).toBeInTheDocument()
})

it('opens the create song-style prompt dialog from the empty song prompt state', async () => {
  const { getMaterialDetail } = await import('@/lib/api/materials')
  const detail = createMockMaterialDetail()
  detail.items = [
    {
      ...detail.items[0],
      prompts: [],
    },
  ]
  vi.mocked(getMaterialDetail).mockResolvedValue({
    success: true,
    data: detail,
  })

  const user = userEvent.setup()
  render(<ArtistWorkspace materialId="artist-1" />)

  await user.click(await screen.findByRole('button', { name: '新建提示词' }))

  expect(screen.getByRole('heading', { name: '新建提示词' })).toBeInTheDocument()
  expect(screen.getByText('创建一个新的歌曲风格提示词候选')).toBeInTheDocument()
})

it('opens the create artist prompt dialog from the empty artist prompt state', async () => {
  const { getMaterialDetail } = await import('@/lib/api/materials')
  const detail = createMockMaterialDetail()
  detail.materialPrompts = []
  vi.mocked(getMaterialDetail).mockResolvedValue({
    success: true,
    data: detail,
  })

  const user = userEvent.setup()
  render(<ArtistWorkspace materialId="artist-1" />)

  const artistPromptCard = await screen.findByText('音乐人风格 Prompt')
  await user.click(within(artistPromptCard.closest('[class*="rounded"]') as HTMLElement).getByRole('button', { name: '新建提示词' }))

  expect(screen.getByRole('heading', { name: '新建提示词' })).toBeInTheDocument()
  expect(screen.getByText('创建一个新的音乐人风格提示词候选')).toBeInTheDocument()
})
```

- [ ] **Step 2: 运行单测并确认它们先失败**

Run: `npm run test -- src/components/materials/artist/__tests__/ArtistWorkspace.test.tsx`

Expected: 至少 3 条新增用例失败，失败现象应为找不到 dialog title，而不是语法错误、mock 错误或无关断言失败。

- [ ] **Step 3: 若失败原因不对，先修正测试到“正确失败”**

```tsx
// 如果选择器过宽导致点到错误按钮，改成先定位面板再 within(panel)
const songPromptPanel = await screen.findByText('歌曲风格 Prompt')
const panel = songPromptPanel.closest('[class*="rounded"]')
await user.click(within(panel as HTMLElement).getByRole('button', { name: '新建提示词' }))
```

- [ ] **Step 4: 再次运行单测，确认处于稳定 RED 状态**

Run: `npm run test -- src/components/materials/artist/__tests__/ArtistWorkspace.test.tsx`

Expected: 同样的 3 条用例持续失败，且失败原因为 dialog 未渲染。

---

### Task 2: 修复三个 panel 的共享创建弹窗渲染结构

**Files:**
- Modify: `src/components/materials/artist/ArtistPromptPanel.tsx`
- Modify: `src/components/materials/artist/SongLibraryPanel.tsx`
- Modify: `src/components/materials/artist/SongPromptPanel.tsx`
- Test: `src/components/materials/artist/__tests__/ArtistWorkspace.test.tsx`

- [ ] **Step 1: 先把 ArtistPromptPanel 重构为共享 dialog 渲染结构**

```tsx
const createPromptDialog = (
  <Dialog
    open={isCreating}
    onClose={() => setIsCreating(false)}
    title="新建提示词"
    description="创建一个新的音乐人风格提示词候选"
  >
    {/* existing form body */}
  </Dialog>
)

if (prompts.length === 0) {
  return (
    <>
      <Card className="h-full border-dashed">
        {/* existing empty state */}
      </Card>
      {createPromptDialog}
    </>
  )
}

return (
  <>
    <Card className="h-full">
      {/* existing non-empty content */}
    </Card>
    {createPromptDialog}
    <Dialog open={deleteConfirm !== null} /* ... */ />
  </>
)
```

- [ ] **Step 2: 对 SongLibraryPanel 做同样的共享 dialog 提升**

```tsx
const createSongDialog = (
  <Dialog
    open={isCreating}
    onClose={() => setIsCreating(false)}
    title="新建歌曲"
    description="创建一首新歌曲，可以添加歌词和风格提示词"
  >
    {/* existing form body */}
  </Dialog>
)

if (songs.length === 0) {
  return (
    <>
      <Card className="h-full border-dashed">
        {/* existing empty state */}
      </Card>
      {createSongDialog}
    </>
  )
}

return (
  <>
    <Card className="h-full">
      {/* existing non-empty content */}
    </Card>
    {createSongDialog}
    <Dialog open={editingSong !== null} /* ... */ />
    <Dialog open={deleteConfirm !== null} /* ... */ />
  </>
)
```

- [ ] **Step 3: 对 SongPromptPanel 做同样的共享 dialog 提升**

```tsx
const createPromptDialog = (
  <Dialog
    open={isCreating}
    onClose={() => setIsCreating(false)}
    title="新建提示词"
    description="创建一个新的歌曲风格提示词候选"
  >
    {/* existing form body */}
  </Dialog>
)

if (prompts.length === 0) {
  return (
    <>
      <Card className="h-full border-dashed">
        {/* existing empty state */}
      </Card>
      {createPromptDialog}
    </>
  )
}

return (
  <>
    <Card className="h-full">
      {/* existing non-empty content */}
    </Card>
    {createPromptDialog}
    <Dialog open={deleteConfirm !== null} /* ... */ />
  </>
)
```

- [ ] **Step 4: 运行 ArtistWorkspace 测试，确认 RED -> GREEN**

Run: `npm run test -- src/components/materials/artist/__tests__/ArtistWorkspace.test.tsx`

Expected: 新增 3 条空态用例通过，原有创建/重排/本地更新相关用例继续通过。

- [ ] **Step 5: 做最小清理，但不改变行为**

```tsx
// 仅提取共享 dialog 变量或 helper，避免重复 JSX；
// 不重命名 API 字段，不调整 ArtistWorkspace 容器联动逻辑。
```

---

### Task 3: 升级素材管理页与创建素材弹窗的视觉层次

**Files:**
- Modify: `src/components/materials/MaterialManagementLayout.tsx`

- [ ] **Step 1: 先为素材管理页写出更强的结构化视觉骨架**

```tsx
<div className="space-y-8">
  <PageHeader
    icon={<FolderCog className="w-5 h-5" />}
    title="素材管理"
    description="管理素材、条目和提示词"
    gradient="green-emerald"
    actions={
      <Button className="gap-2 rounded-xl px-5 shadow-lg shadow-primary/20">
        <Plus className="w-4 h-4" />
        创建素材
      </Button>
    }
  />

  <Card className="border-border/60 bg-gradient-to-br from-card via-card to-card/90 shadow-xl shadow-black/10">
    {/* search + count toolbar */}
  </Card>
</div>
```

- [ ] **Step 2: 改造列表项的层次、选项标记和 hover 反馈**

```tsx
<div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/95 p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10">
  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
  <div className="flex items-start justify-between gap-4">
    {/* title + type badge + meta */}
    {/* action buttons */}
  </div>
</div>
```

- [ ] **Step 3: 把“创建素材”弹窗升级为起稿面板风格**

```tsx
<Dialog
  open={isCreateDialogOpen}
  onClose={() => setIsCreateDialogOpen(false)}
  title="创建素材"
  description="创建一个新的创作容器，用于组织人物、歌曲与风格提示词"
>
  <div className="space-y-5 py-2">
    <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
      <p className="text-sm font-medium text-foreground">从一个新的素材容器开始</p>
      <p className="mt-1 text-sm text-muted-foreground">先命名，再进入工作台持续补充人物和歌曲内容。</p>
    </div>
    {/* existing form controls with stronger spacing and labels */}
  </div>
</Dialog>
```

- [ ] **Step 4: 运行页面相关测试，确保对话框和文案行为不回退**

Run: `npm run test -- src/components/materials/__tests__/MaterialManagementLayout.test.tsx`

Expected: 现有测试继续通过；若文案更新导致断言失效，同步把测试改到新文案并保持“portal 渲染到 document.body”的断言不变。

---

### Task 4: 升级 Artist Workspace 四块面板的视觉身份

**Files:**
- Modify: `src/components/materials/artist/ArtistBasicInfoPanel.tsx`
- Modify: `src/components/materials/artist/ArtistPromptPanel.tsx`
- Modify: `src/components/materials/artist/SongLibraryPanel.tsx`
- Modify: `src/components/materials/artist/SongPromptPanel.tsx`
- Modify: `src/components/materials/artist/ArtistWorkspace.tsx`

- [ ] **Step 1: 把 ArtistBasicInfoPanel 改成“档案卡”视觉**

```tsx
<Card className="relative overflow-hidden border-border/60 bg-gradient-to-br from-card via-card to-primary/5 shadow-xl shadow-black/10">
  <CardHeader className="border-b border-border/50 pb-4">
    <div className="space-y-1">
      <CardTitle className="text-base tracking-wide">基本信息</CardTitle>
      <p className="text-sm text-muted-foreground">维护当前素材的人物档案和基础说明。</p>
    </div>
  </CardHeader>
  <CardContent className="space-y-5 pt-5">
    {/* existing inputs + stronger footer CTA */}
  </CardContent>
</Card>
```

- [ ] **Step 2: 让三个创作面板各自拥有明确身份与空态表达**

```tsx
// ArtistPromptPanel: 创作母板
<Card className="border-fuchsia-500/15 bg-gradient-to-br from-card via-card to-fuchsia-500/5" />

// SongLibraryPanel: 编目区
<Card className="border-cyan-500/15 bg-gradient-to-br from-card via-card to-cyan-500/5" />

// SongPromptPanel: 当前歌曲风格工作区
<Card className="border-amber-500/15 bg-gradient-to-br from-card via-card to-amber-500/5" />
```

- [ ] **Step 3: 统一空态 CTA、标题带和说明文案**

```tsx
<EmptyState
  icon={Music2}
  title="暂无提示词"
  description="先创建第一条候选，定义当前歌曲的风格方向。"
  action={
    <Button className="gap-2 rounded-xl px-4 shadow-lg shadow-primary/20">
      <Plus className="w-4 h-4" />
      新建提示词
    </Button>
  }
/>
```

- [ ] **Step 4: 仅对 ArtistWorkspace 容器做必要的节奏增强，不改变 2x2 布局契约**

```tsx
<div className="space-y-8">
  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
    {/* left and right columns stay unchanged */}
  </div>
</div>
```

- [ ] **Step 5: 运行工作台组合测试，确保视觉改造没有打断已有行为**

Run: `npm run test -- src/components/materials/artist/__tests__/ArtistWorkspace.test.tsx`

Expected: 创建、重排、局部更新、空态 dialog 三类测试全部通过。

---

### Task 5: 做项目级验证与本地无头浏览器核验

**Files:**
- Modify: `src/components/materials/MaterialManagementLayout.tsx`
- Modify: `src/components/materials/artist/ArtistBasicInfoPanel.tsx`
- Modify: `src/components/materials/artist/ArtistPromptPanel.tsx`
- Modify: `src/components/materials/artist/SongLibraryPanel.tsx`
- Modify: `src/components/materials/artist/SongPromptPanel.tsx`
- Modify: `src/components/materials/artist/ArtistWorkspace.tsx`
- Test: `src/components/materials/__tests__/MaterialManagementLayout.test.tsx`
- Test: `src/components/materials/artist/__tests__/ArtistWorkspace.test.tsx`

- [ ] **Step 1: 运行 materials 相关测试集**

Run: `npm run test -- src/components/materials/__tests__/MaterialManagementLayout.test.tsx src/components/materials/artist/__tests__/ArtistWorkspace.test.tsx`

Expected: 两个测试文件全部通过。

- [ ] **Step 2: 运行完整构建验证 TypeScript 与打包**

Run: `npm run build`

Expected: `tsc -b && vite build` 退出码为 0，无新增 TypeScript 错误。

- [ ] **Step 3: 启动本地应用并用无头浏览器核验真实交互**

Run: `npm run dev -- --host 127.0.0.1 --port 4173`

Expected: 本地开发服务可访问。

Browser checklist:

```text
1. 打开 /materials，确认页头、工具带、列表/空态层次已明显增强
2. 打开“创建素材”，确认弹窗具备更强的起稿面板气质
3. 进入 /materials/:id/edit
4. 在歌曲列表为空时点击“新建歌曲”，确认弹窗真实可见
5. 在音乐人 prompt 为空时点击“新建提示词”，确认弹窗真实可见
6. 在歌曲 prompt 为空时点击“新建提示词”，确认弹窗真实可见
7. 检查四个 panel 的色相偏置、标题层级、CTA 权重和空态表达是否明确区分
```

- [ ] **Step 4: 记录验证结果，并只修复本次变更引入的问题**

```text
- 如果测试或浏览器发现回归，只修复本次改动引起的问题
- 若发现与本次无关的预存问题，记录并单独汇报，不在当前任务顺手扩改
```

---

## Spec Coverage 自检

- 已覆盖三个已确认根因：`SongLibraryPanel`、`SongPromptPanel`、`ArtistPromptPanel` 的空态创建弹窗问题
- 已覆盖三个页面的视觉升级：素材管理页、创建素材弹窗、Artist Workspace
- 已覆盖测试策略：三类空态创建弹窗回归 + 现有行为回归
- 已覆盖运行时验证：本地无头浏览器，不依赖用户访问本地 URL
- 已保持实现边界：保留路由、2x2 容器结构、共享组件和 Tailwind token

## 占位符自检

- 本计划不包含 `TBD`、`TODO`、`稍后实现`、`参考前文` 这类占位描述
- 每个任务都给出了明确文件路径、代码骨架、执行命令与期望结果

## 类型与接口一致性自检

- `createMaterialItem(materialId, { material_id, item_type: 'song', name, lyrics })` 与现有实现一致
- `createPrompt({ target_type, target_id, slot_type, name, content, is_default })` 与现有 artist/song prompt API 一致
- `ArtistWorkspace` 仍通过 `selectedSongId` 与 `selectedSong?.prompts || []` 维持歌曲级联动，不引入新的容器契约
