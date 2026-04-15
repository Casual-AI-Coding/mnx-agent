# 图片生成功能增强实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 增强图片生成页面的参数配置，使其与 MiniMax 官方调试台保持一致

**Architecture:** 修改前端 UI（ImageGeneration.tsx），新增 AspectRatioPopup 组件，调整 API 参数传递，后端路由支持新参数

**Tech Stack:** React, TypeScript, Zustand, Tailwind CSS, Express

---

## 文件结构

| 文件 | 操作 | 职责 |
|------|------|------|
| `src/pages/ImageGeneration.tsx` | 修改 | 主页面，参数选择 UI |
| `src/components/ui/AspectRatioPopup.tsx` | 新增 | 宽高比弹窗组件 |
| `src/types/image.ts` | 修改 | 增加 width/height 参数定义 |
| `src/lib/api/image.ts` | 修改 | 支持新参数传递 |
| `server/routes/image.ts` | 修改 | 后端路由支持新参数 |

---

## Task 1: 图片数量和并发数量按钮调整

**Files:**
- Modify: `src/pages/ImageGeneration.tsx:562-614`

- [ ] **Step 1: 修改图片数量按钮选项**

修改 `ImageGeneration.tsx` 第 566 行，将 `[1, 2, 3, 4, 5, 6, 7, 8, 9]` 改为 `[4, 5, 6, 7, 8, 9]`:

```tsx
// 修改前 (line 566)
{[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (

// 修改后
{[4, 5, 6, 7, 8, 9].map(n => (
```

- [ ] **Step 2: 修改默认值**

修改 `ImageGeneration.tsx` 第 67 行，将 numImages 默认值改为 9:

```tsx
// 修改前 (line 67)
const [numImages, setNumImages] = useState(imageSettings.numImages)

// 修改后
const [numImages, setNumImages] = useState(imageSettings.numImages ?? 9)
```

- [ ] **Step 3: 修改并发数量按钮选项**

修改 `ImageGeneration.tsx` 第 586 行，将 1-10 改为 1-5:

```tsx
// 修改前 (line 586)
{Array.from({ length: 10 }, (_, i) => i + 1).map(n => (

// 修改后
{Array.from({ length: 5 }, (_, i) => i + 1).map(n => (
```

- [ ] **Step 4: 验证修改**

运行开发服务器，检查按钮显示正确。

```bash
npm run dev
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/ImageGeneration.tsx
git commit -m "feat(image): adjust numImages (4-9) and parallelCount (1-5) options"
```

---

## Task 2: 创建宽高比弹窗组件

**Files:**
- Create: `src/components/ui/AspectRatioPopup.tsx`

- [ ] **Step 1: 创建弹窗组件文件**

```tsx
// src/components/ui/AspectRatioPopup.tsx
import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'
import { ASPECT_RATIOS, type AspectRatio } from '@/models'

interface AspectRatioPopupProps {
  open: boolean
  onClose: () => void
  value: AspectRatioState
  onChange: (value: AspectRatioState) => void
}

export interface AspectRatioState {
  type: 'preset' | 'custom'
  preset?: AspectRatio
  width?: number
  height?: number
}

export function AspectRatioPopup({ open, onClose, value, onChange }: AspectRatioPopupProps) {
  const [customWidth, setCustomWidth] = useState(value.width ?? 512)
  const [customHeight, setCustomHeight] = useState(value.height ?? 512)
  const [selectedType, setSelectedType] = useState<'preset' | 'custom'>(
    value.type === 'custom' ? 'custom' : 'preset'
  )
  const [selectedPreset, setSelectedPreset] = useState<AspectRatio>(
    value.preset ?? '1:1'
  )

  const handlePresetSelect = (preset: AspectRatio) => {
    setSelectedPreset(preset)
    setSelectedType('preset')
    onChange({ type: 'preset', preset })
    onClose()
  }

  const handleCustomConfirm = () => {
    onChange({
      type: 'custom',
      width: customWidth,
      height: customHeight,
    })
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title="选择宽高比" size="sm">
      <div className="space-y-4">
        {/* 预设比例 Grid */}
        <div className="grid grid-cols-4 gap-2">
          {ASPECT_RATIOS.map((ratio) => (
            <button
              key={ratio.id}
              onClick={() => handlePresetSelect(ratio.id)}
              className={cn(
                "flex flex-col items-center justify-center py-2.5 rounded-lg transition-all border",
                selectedType === 'preset' && selectedPreset === ratio.id
                  ? "bg-primary/20 border-primary text-primary"
                  : "bg-background/50 border-border text-muted-foreground hover:border-border hover:text-foreground"
              )}
            >
              <span className="text-lg leading-none mb-1">{ratio.icon}</span>
              <span className="text-xs font-medium">{ratio.label}</span>
            </button>
          ))}
        </div>

        {/* 分隔线 */}
        <div className="border-t border-border" />

        {/* 自定义尺寸 */}
        <div className="space-y-3">
          <button
            onClick={() => setSelectedType('custom')}
            className={cn(
              "flex items-center gap-2 w-full px-3 py-2 rounded-lg transition-all border",
              selectedType === 'custom'
                ? "bg-primary/10 border-primary/50 text-primary"
                : "bg-background/50 border-border text-muted-foreground hover:bg-secondary"
            )}
          >
            <span className="text-sm font-medium">自定义尺寸</span>
          </button>

          {selectedType === 'custom' && (
            <div className="flex gap-3 items-center">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">宽度</label>
                <Input
                  type="number"
                  value={customWidth}
                  onChange={(e) => setCustomWidth(parseInt(e.target.value) || 512)}
                  min={64}
                  max={2048}
                  className="w-full"
                />
              </div>
              <span className="text-muted-foreground">×</span>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">高度</label>
                <Input
                  type="number"
                  value={customHeight}
                  onChange={(e) => setCustomHeight(parseInt(e.target.value) || 512)}
                  min={64}
                  max={2048}
                  className="w-full"
                />
              </div>
            </div>
          )}
        </div>

        {/* 确认按钮 */}
        {selectedType === 'custom' && (
          <button
            onClick={handleCustomConfirm}
            className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            确认
          </button>
        )}
      </div>
    </Dialog>
  )
}
```

- [ ] **Step 2: 验证组件创建**

检查文件存在且 TypeScript 无错误。

```bash
ls -la src/components/ui/AspectRatioPopup.tsx
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/AspectRatioPopup.tsx
git commit -m "feat(ui): add AspectRatioPopup component"
```

---

## Task 3: 集成宽高比弹窗到 ImageGeneration

**Files:**
- Modify: `src/pages/ImageGeneration.tsx:66,541-559`

- [ ] **Step 1: 导入新组件**

修改 `ImageGeneration.tsx` 第 1 行附近的 import 区域，添加导入:

```tsx
// 在 import 区域添加
import { AspectRatioPopup, type AspectRatioState } from '@/components/ui/AspectRatioPopup'
```

- [ ] **Step 2: 修改状态变量**

修改第 66-67 行，将 aspectRatio 状态改为新结构:

```tsx
// 修改前 (line 66)
const [aspectRatio, setAspectRatio] = useState<AspectRatio>(imageSettings.aspectRatio as AspectRatio)

// 修改后
const [aspectRatioState, setAspectRatioState] = useState<AspectRatioState>({
  type: 'preset',
  preset: imageSettings.aspectRatio as AspectRatio,
})
const [showAspectRatioPopup, setShowAspectRatioPopup] = useState(false)
```

- [ ] **Step 3: 替换宽高比 UI**

修改第 541-559 行，替换为弹窗触发按钮:

```tsx
// 修改前 (line 541-559)
<div className="space-y-2">
  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('imageGeneration.aspectRatio') || '宽高比'}</label>
  <div className="grid grid-cols-4 gap-2">
    {ASPECT_RATIOS.slice(0, 4).map(ratio => (
      <button
        key={ratio.id}
        onClick={() => setAspectRatio(ratio.id)}
        className={`flex flex-col items-center justify-center py-2.5 rounded-lg transition-all duration-200 border ${
          aspectRatio === ratio.id
            ? 'bg-gradient-to-br from-primary/80 to-accent/80 border-primary/50 text-primary-foreground shadow-lg shadow-primary/20'
            : 'bg-background/50 border-border text-muted-foreground/70 hover:border-border hover:text-foreground'
        }`}
      >
        <span className="text-lg leading-none mb-1">{ratio.icon}</span>
        <span className="text-xs font-medium">{ratio.label}</span>
      </button>
    ))}
  </div>
</div>

// 修改后
<div className="space-y-2">
  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('imageGeneration.aspectRatio') || '宽高比'}</label>
  <button
    onClick={() => setShowAspectRatioPopup(true)}
    className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg bg-background/50 border border-border hover:border-primary/50 transition-colors"
  >
    <span className="text-sm font-medium text-foreground">
      {aspectRatioState.type === 'custom'
        ? `${aspectRatioState.width} × ${aspectRatioState.height}`
        : ASPECT_RATIOS.find(r => r.id === aspectRatioState.preset)?.label ?? '1:1'}
    </span>
    <span className="text-muted-foreground">选择</span>
  </button>
  <AspectRatioPopup
    open={showAspectRatioPopup}
    onClose={() => setShowAspectRatioPopup(false)}
    value={aspectRatioState}
    onChange={setAspectRatioState}
  />
</div>
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/ImageGeneration.tsx
git commit -m "feat(image): integrate AspectRatioPopup into ImageGeneration"
```

---

## Task 4: 参考图片 URL 输入功能

**Files:**
- Modify: `src/pages/ImageGeneration.tsx:68,469-505`

- [ ] **Step 1: 导入 Tabs 组件**

修改 import 区域，添加 Tabs 相关导入:

```tsx
// 在 import 区域添加
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
```

- [ ] **Step 2: 修改状态变量**

修改第 68 行附近，添加 referenceImageMode 状态:

```tsx
// 在第 68 行附近添加
const [referenceImage, setReferenceImage] = useState<string | null>(null)
const [referenceImageMode, setReferenceImageMode] = useState<'upload' | 'url'>('upload')
const [referenceImageUrl, setReferenceImageUrl] = useState('')
```

- [ ] **Step 3: 替换参考图片 UI**

修改第 469-505 行，替换为 Tabs 结构:

```tsx
// 修改前 (line 469-505)
<div className="p-4">
  {referenceImage ? (
    <div className="relative group/image">
      <img
        src={referenceImage}
        alt="Reference"
        className="w-full max-h-48 object-contain rounded-lg border border-border/50"
      />
      <button
        onClick={removeReferenceImage}
        className="absolute top-2 right-2 p-1.5 rounded-lg bg-background/80 text-muted-foreground/70 hover:text-destructive hover:bg-card transition-colors opacity-0 group-hover/image:opacity-100"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  ) : (
    <div
      onClick={() => fileInputRef.current?.click()}
      className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 group/upload"
    >
      ...
      <input ... />
    </div>
  )}
</div>

// 修改后
<div className="p-4">
  {referenceImage ? (
    <div className="relative group/image">
      <img
        src={referenceImage}
        alt="Reference"
        className="w-full max-h-48 object-contain rounded-lg border border-border/50"
      />
      <button
        onClick={removeReferenceImage}
        className="absolute top-2 right-2 p-1.5 rounded-lg bg-background/80 text-muted-foreground/70 hover:text-destructive hover:bg-card transition-colors opacity-0 group-hover/image:opacity-100"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  ) : (
    <Tabs value={referenceImageMode} onValueChange={(v) => setReferenceImageMode(v as 'upload' | 'url')}>
      <TabsList className="w-full">
        <TabsTrigger value="upload" className="flex-1">上传图片</TabsTrigger>
        <TabsTrigger value="url" className="flex-1">图片URL</TabsTrigger>
      </TabsList>
      
      <TabsContent value="upload">
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 group/upload"
        >
          <div className="relative mx-auto w-12 h-12 mb-3">
            <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full group-hover/upload:blur-2xl transition-all" />
            <Upload className="w-12 h-12 relative text-muted-foreground/50 group-hover/upload:text-accent-foreground transition-colors" />
          </div>
          <p className="text-sm font-medium text-muted-foreground/70 group-hover/upload:text-foreground transition-colors">
            {t('imageGeneration.clickToUpload') || '点击上传参考图片'}
          </p>
          <p className="text-xs text-muted-foreground/50 mt-1">JPG, PNG</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </TabsContent>
      
      <TabsContent value="url">
        <div className="space-y-3">
          <Input
            value={referenceImageUrl}
            onChange={(e) => setReferenceImageUrl(e.target.value)}
            placeholder="输入图片 URL..."
            className="w-full"
          />
          <button
            onClick={() => {
              if (referenceImageUrl.trim()) {
                setReferenceImage(referenceImageUrl.trim())
              }
            }}
            disabled={!referenceImageUrl.trim()}
            className="w-full py-2 rounded-lg bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            使用此 URL
          </button>
        </div>
      </TabsContent>
    </Tabs>
  )}
</div>
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/ImageGeneration.tsx
git commit -m "feat(image): add URL input option for reference image"
```

---

## Task 5: 高级设置增加自动优化提示词开关

**Files:**
- Modify: `src/pages/ImageGeneration.tsx:72-73,628-654`

- [ ] **Step 1: 导入 Switch 组件**

修改 import 区域:

```tsx
// 在 import 区域添加
import { Switch } from '@/components/ui/Switch'
```

- [ ] **Step 2: 添加状态变量**

在第 72 行附近添加:

```tsx
// 在第 72 行附近添加
const [seed, setSeed] = useState<number | undefined>()
const [promptOptimizer, setPromptOptimizer] = useState(false)
```

- [ ] **Step 3: 在高级设置中添加开关**

修改第 628-654 行区域，在 Seed 输入之前添加开关:

```tsx
// 修改后 (在 AnimatePresence 内，seed 输入之前)
<AnimatePresence>
  {showAdvanced && (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="space-y-4 overflow-hidden"
    >
      {/* 自动优化提示词 */}
      <div className="flex items-center justify-between">
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">自动优化提示词</label>
          <p className="text-xs text-muted-foreground/50 mt-0.5">AI 将优化你的提示词以获得更好效果</p>
        </div>
        <Switch
          checked={promptOptimizer}
          onCheckedChange={setPromptOptimizer}
        />
      </div>

      {/* Seed 输入 */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('imageGeneration.seed') || '随机种子'}</label>
        <div className="flex gap-2">
          <Input
            type="number"
            value={seed || ''}
            onChange={(e) => setSeed(e.target.value ? parseInt(e.target.value) : undefined)}
            placeholder={t('imageGeneration.seedPlaceholder') || '留空则随机'}
            className="flex-1 bg-background/50 border-border text-foreground focus:border-primary/50"
          />
          <button
            onClick={() => setSeed(Math.floor(Math.random() * 1000000))}
            className="px-3 py-2 rounded-lg bg-secondary text-muted-foreground/70 hover:text-foreground hover:bg-secondary/80 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground/50">{t('imageGeneration.seedTip') || '使用相同的种子可重现相似结果'}</p>
      </div>
    </motion.div>
  )}
</AnimatePresence>
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/ImageGeneration.tsx
git commit -m "feat(image): add prompt optimizer toggle in advanced settings"
```

---

## Task 6: 更新 API 参数传递

**Files:**
- Modify: `src/pages/ImageGeneration.tsx:156-233`
- Modify: `src/lib/api/image.ts:28`
- Modify: `src/types/image.ts:4-17`

- [ ] **Step 1: 更新类型定义**

修改 `src/types/image.ts`，添加 width/height 参数:

```tsx
// 修改 ImageGenerationRequest (line 4-17)
export interface ImageGenerationRequest {
  model: ImageModel
  prompt: string
  response_format?: 'url' | 'b64_json'
  n?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
  prompt_optimizer?: boolean
  aspect_ratio?: AspectRatio
  width?: number
  height?: number
  seed?: number
  subject_reference?: {
    image_id: string
    description?: string
  }
  style?: string
}
```

- [ ] **Step 2: 更新 handleGenerate 函数**

修改 `ImageGeneration.tsx` 中 handleGenerate 的 API 调用（第 166-172 行和第 226-232 行）:

```tsx
// 修改前 (line 166-172)
const response = await generateImage({
  model,
  prompt: prompt.trim(),
  n: numImages as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9,
  aspect_ratio: aspectRatio,
  seed,
})

// 修改后
const response = await generateImage({
  model,
  prompt: prompt.trim(),
  n: numImages as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9,
  prompt_optimizer: promptOptimizer,
  ...(aspectRatioState.type === 'preset'
    ? { aspect_ratio: aspectRatioState.preset }
    : { width: aspectRatioState.width, height: aspectRatioState.height }),
  seed,
})
```

同步修改第 226-232 行（并发模式）的调用。

- [ ] **Step 3: Commit**

```bash
git add src/pages/ImageGeneration.tsx src/types/image.ts
git commit -m "feat(image): update API params for aspectRatioState and promptOptimizer"
```

---

## Task 7: 更新后端路由支持新参数

**Files:**
- Modify: `server/routes/image.ts:7-39`

- [ ] **Step 1: 扩展请求体类型**

修改 `server/routes/image.ts` 第 7-14 行:

```typescript
// 修改前
interface ImageGenerateBody {
  model?: string
  prompt: string
  num_images?: number
  width?: number
  height?: number
  style?: string
}

// 修改后
interface ImageGenerateBody {
  model?: string
  prompt: string
  n?: number
  num_images?: number  // 兼容旧参数
  prompt_optimizer?: boolean
  aspect_ratio?: string
  width?: number
  height?: number
  seed?: number
  style?: string
}
```

- [ ] **Step 2: 更新 buildRequestBody**

修改第 20-38 行:

```typescript
// 修改前
buildRequestBody: (req: Request) => {
  const { model, prompt, num_images, width, height, style } = req.body as ImageGenerateBody

  if (!prompt) {
    throw { status: 400, message: 'prompt is required' }
  }

  const body: Record<string, unknown> = {
    model: model || 'image-01',
    prompt,
  }

  if (num_images !== undefined) body.num_images = num_images
  if (width !== undefined) body.width = width
  if (height !== undefined) body.height = height
  if (style !== undefined) body.style = style

  return body
}

// 修改后
buildRequestBody: (req: Request) => {
  const { model, prompt, n, num_images, prompt_optimizer, aspect_ratio, width, height, seed, style } = req.body as ImageGenerateBody

  if (!prompt) {
    throw { status: 400, message: 'prompt is required' }
  }

  const body: Record<string, unknown> = {
    model: model || 'image-01',
    prompt,
  }

  // 支持两种数量参数格式
  if (n !== undefined) body.n = n
  if (num_images !== undefined) body.num_images = num_images
  
  // 新增参数
  if (prompt_optimizer !== undefined) body.prompt_optimizer = prompt_optimizer
  if (aspect_ratio !== undefined) body.aspect_ratio = aspect_ratio
  if (width !== undefined) body.width = width
  if (height !== undefined) body.height = height
  if (seed !== undefined) body.seed = seed
  if (style !== undefined) body.style = style

  return body
}
```

- [ ] **Step 3: Commit**

```bash
git add server/routes/image.ts
git commit -m "feat(server): support new image generation params"
```

---

## Task 8: 验证与测试

**Files:**
- 无文件修改，仅运行验证

- [ ] **Step 1: 运行 TypeScript 检查**

```bash
npm run build
```

Expected: 无类型错误

- [ ] **Step 2: 启动开发服务器验证 UI**

```bash
npm run dev
```

手动检查:
- 图片数量按钮显示 [4,5,6,7,8,9]
- 默认选中 9
- 并发数量按钮显示 [1,2,3,4,5]
- 宽高比按钮可打开弹窗
- 弹窗显示全部 8 个预设 + 自定义尺寸
- 参考图片支持上传和 URL Tab
- 高级设置包含自动优化提示词开关

- [ ] **Step 3: 测试 API 调用**

在浏览器中测试生成图片，检查:
- 预设比例调用使用 aspect_ratio
- 自定义尺寸调用使用 width/height
- prompt_optimizer 参数正确传递

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(image): complete image generation enhancements"
```

---

## Self-Review Checklist

完成后检查:

1. **Spec coverage:**
   - 图片数量 4-9 ✓ Task 1
   - 并发数量 1-5 ✓ Task 1
   - 宽高比弹窗 + 自定义尺寸 ✓ Task 2, 3
   - 参考图片 URL ✓ Task 4
   - 自动优化提示词开关 ✓ Task 5
   - API 参数传递 ✓ Task 6
   - 后端路由 ✓ Task 7

2. **Placeholder scan:**
   - 无 TBD/TODO
   - 所有代码完整
   - 无 "类似 Task N" 引用

3. **Type consistency:**
   - AspectRatioState 定义在 AspectRatioPopup.tsx
   - ImageGenerationRequest 在 types/image.ts
   - 所有引用使用相同类型名