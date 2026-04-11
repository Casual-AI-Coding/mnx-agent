# 音乐生成功能增强实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 对齐官方 MiniMax 音乐调试台，补齐纯音乐模式、seed 参数、music-cover 翻唱、高级设置面板、字符计数器

**Architecture:** Frontend 增加新 UI 组件（Collapsible、翻唱 Tabs），Backend 新增预处理 API `/music/preprocess`，扩展现有 `/music/generate` 参数

**Tech Stack:** React, TypeScript, Tailwind CSS, Express, MiniMax API

---

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `src/components/ui/Collapsible.tsx` | Create | 折叠面板组件（高级设置用） |
| `src/types/music.ts` | Modify | 扩展类型定义（seed, instrumental, reference_audio_url） |
| `src/lib/api/music.ts` | Modify | 添加 `preprocessMusic` 函数 |
| `src/pages/MusicGeneration.tsx` | Modify | 主要 UI 变化：纯音乐模式、翻唱面板、高级设置、字符计数 |
| `server/routes/music.ts` | Modify | 添加 `/preprocess` 路由，扩展 `/generate` 参数 |
| `server/lib/minimax.ts` | Modify | 添加 `musicPreprocess` 方法 |

---

## Task 1: 创建 Collapsible 组件

**Files:**
- Create: `src/components/ui/Collapsible.tsx`

- [ ] **Step 1: 创建 Collapsible 组件文件**

```tsx
// src/components/ui/Collapsible.tsx
import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CollapsibleContextValue {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

const CollapsibleContext = React.createContext<CollapsibleContextValue | undefined>(undefined)

const useCollapsible = () => {
  const context = React.useContext(CollapsibleContext)
  if (!context) {
    throw new Error('useCollapsible must be used within a Collapsible provider')
  }
  return context
}

interface CollapsibleProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const Collapsible = React.forwardRef<HTMLDivElement, CollapsibleProps>(
  ({ className, defaultOpen = false, open: controlledOpen, onOpenChange, children, ...props }, ref) => {
    const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
    const isControlled = controlledOpen !== undefined
    const isOpen = isControlled ? controlledOpen : uncontrolledOpen

    const setIsOpen = React.useCallback((value: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(value)
      }
      onOpenChange?.(value)
    }, [isControlled, onOpenChange])

    return (
      <CollapsibleContext.Provider value={{ isOpen, setIsOpen }}>
        <div ref={ref} className={cn('space-y-2', className)} {...props}>
          {children}
        </div>
      </CollapsibleContext.Provider>
    )
  }
)
Collapsible.displayName = 'Collapsible'

interface CollapsibleTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode
}

const CollapsibleTrigger = React.forwardRef<HTMLButtonElement, CollapsibleTriggerProps>(
  ({ className, children, icon, ...props }, ref) => {
    const { isOpen, setIsOpen } = useCollapsible()

    return (
      <button
        ref={ref}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex w-full items-center justify-between py-2 text-sm font-medium text-foreground transition-all hover:text-muted-foreground',
          className
        )}
        {...props}
      >
        <span>{children}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>
    )
  }
)
CollapsibleTrigger.displayName = 'CollapsibleTrigger'

interface CollapsibleContentProps extends React.HTMLAttributes<HTMLDivElement> {}

const CollapsibleContent = React.forwardRef<HTMLDivElement, CollapsibleContentProps>(
  ({ className, children, ...props }, ref) => {
    const { isOpen } = useCollapsible()

    if (!isOpen) return null

    return (
      <div
        ref={ref}
        className={cn(
          'overflow-hidden rounded-md border border-input bg-background p-4',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
CollapsibleContent.displayName = 'CollapsibleContent'

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
```

- [ ] **Step 2: Commit Collapsible 组件**

```bash
git add src/components/ui/Collapsible.tsx
git commit -m "feat(ui): add Collapsible component for expandable panels"
```

---

## Task 2: 扩展 Music 类型定义

**Files:**
- Modify: `src/types/music.ts`

- [ ] **Step 1: 扩展 MusicGenerationRequest 接口**

```typescript
// src/types/music.ts
import type { MusicModel } from '../models'

export interface MusicGenerationRequest {
  model: MusicModel
  lyrics?: string           // 纯音乐模式可为空
  style_prompt?: string     // 纯音乐模式必填
  optimize_lyrics?: boolean // 适用于 2.5/2.5+/2.6
  audio_setting?: {
    sample_rate?: 44100 | 48000
    bitrate?: '128k' | '192k' | '256k' | '320k'
    format?: 'mp3' | 'wav' | 'flac'
  }
  output_format?: 'hex' | 'url'
  seed?: number             // 仅 music-2.6 有效

  // music-cover 特有
  reference_audio_url?: string
  use_original_lyrics?: boolean
}

export interface MusicGenerationResponse {
  trace_id: string
  data: {
    audio: string
    duration: number
  }
}

// 新增：预处理请求响应
export interface MusicPreprocessResponse {
  lyrics: string
  audio_url: string
  duration: number
}
```

- [ ] **Step 2: Commit 类型扩展**

```bash
git add src/types/music.ts
git commit -m "feat(types): extend MusicGenerationRequest for instrumental, seed, music-cover"
```

---

## Task 3: 扩展 Backend MiniMax Client

**Files:**
- Modify: `server/lib/minimax.ts`

- [ ] **Step 1: 添加 musicPreprocess 方法**

在 `MiniMaxClient` 类中添加新方法（约第 168 行后）：

```typescript
// server/lib/minimax.ts
// 在 musicGeneration 方法后添加

async musicPreprocess(formData: FormData): Promise<unknown> {
  try {
    const response = await this.client.post('/v1/music_cover_preprocess', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  } catch (error) {
    return this.handleError(error as AxiosError<MiniMaxErrorResponse>)
  }
}
```

- [ ] **Step 2: 在 MockMiniMaxClient 添加 mock 方法**

在 `MockMiniMaxClient` 类中添加（约第 341 行）：

```typescript
// server/lib/minimax.ts
// 在 MockMiniMaxClient 类中添加

async musicPreprocess(): Promise<unknown> { return this.createErrorResponse('musicPreprocess') }
```

- [ ] **Step 3: Commit MiniMax Client 扩展**

```bash
git add server/lib/minimax.ts
git commit -m "feat(minimax): add musicPreprocess method for cover preprocessing"
```

---

## Task 4: 扩展 Backend Music 路由

**Files:**
- Modify: `server/routes/music.ts`

- [ ] **Step 1: 扩展 MusicGenerateBody 接口**

```typescript
// server/routes/music.ts
interface MusicGenerateBody {
  model?: string
  lyrics?: string           // 改为可选（纯音乐模式）
  style_prompt?: string
  optimize_lyrics?: boolean
  audio_setting?: {
    sample_rate?: number
    bitrate?: string        // 改为 string ('128k', etc.)
    format?: 'mp3' | 'wav' | 'flac'
  }
  output_format?: 'hex' | 'url'
  seed?: number             // 新增

  // music-cover 特有
  reference_audio_url?: string
  use_original_lyrics?: boolean
}
```

- [ ] **Step 2: 修改 generate 路由验证逻辑**

```typescript
// server/routes/music.ts
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const client = getClientFromRequest(req)
    const {
      model,
      lyrics,
      style_prompt,
      optimize_lyrics,
      audio_setting,
      output_format,
      seed,
      reference_audio_url,
      use_original_lyrics,
    } = req.body as MusicGenerateBody

    // 纯音乐模式：lyrics 可为空，但 style_prompt 必填
    const isInstrumental = model === 'music-2.6' || model === 'music-2.5+'
    if (!lyrics && !style_prompt) {
      errorResponse(res, '纯音乐模式需要填写风格描述', 400)
      return
    }
    // 非纯音乐模式：lyrics 必填
    if (!isInstrumental && !lyrics) {
      errorResponse(res, 'lyrics is required', 400)
      return
    }

    // music-cover 模式验证
    if (model === 'music-cover' && !reference_audio_url) {
      errorResponse(res, 'reference_audio_url is required for music-cover model', 400)
      return
    }

    const body: Record<string, unknown> = {
      model: model || 'music-2.5',
      output_format: output_format || 'url',
    }

    if (lyrics) body.lyrics = lyrics
    if (style_prompt) body.style_prompt = style_prompt
    if (optimize_lyrics !== undefined) body.optimize_lyrics = optimize_lyrics
    if (audio_setting) body.audio_setting = audio_setting
    if (seed !== undefined) body.seed = seed
    if (reference_audio_url) body.reference_audio_url = reference_audio_url
    if (use_original_lyrics !== undefined) body.use_original_lyrics = use_original_lyrics

    const result = await client.musicGeneration(body)
    successResponse(res, result)
  } catch (error) {
    handleApiError(res, error)
  }
})
```

- [ ] **Step 3: 添加 preprocess 路由**

在 `generate` 路由后添加：

```typescript
// server/routes/music.ts
import multer from 'multer'

const upload = multer({ storage: multer.memoryStorage() })

router.post('/preprocess', upload.single('audio_file'), async (req: Request, res: Response) => {
  try {
    const client = getClientFromRequest(req)

    if (!req.file) {
      errorResponse(res, 'audio_file is required', 400)
      return
    }

    // 文件格式验证
    const allowedFormats = ['mp3', 'wav', 'flac']
    const ext = req.file.originalname.split('.').pop()?.toLowerCase()
    if (!ext || !allowedFormats.includes(ext)) {
      errorResponse(res, `仅支持 ${allowedFormats.join('/')} 格式`, 400)
      return
    }

    // 构建 FormData
    const formData = new FormData()
    formData.append('audio_file', new Blob([req.file.buffer]), req.file.originalname)

    const result = await client.musicPreprocess(formData) as {
      lyrics: string
      audio_url: string
      duration: number
    }

    successResponse(res, result)
  } catch (error) {
    handleApiError(res, error)
  }
})
```

- [ ] **Step 4: 检查 multer 依赖**

```bash
npm list multer
# 如果没有安装
npm install multer @types/multer
```

- [ ] **Step 5: Commit Backend 路由扩展**

```bash
git add server/routes/music.ts package.json package-lock.json
git commit -m "feat(music): add preprocess endpoint and extend generate parameters"
```

---

## Task 5: 扩展 Frontend API 函数

**Files:**
- Modify: `src/lib/api/music.ts`

- [ ] **Step 1: 添加 preprocessMusic 函数**

```typescript
// src/lib/api/music.ts
import { getBaseUrl, getHeaders } from './config'
import type { MusicGenerationRequest, MusicGenerationResponse, MusicPreprocessResponse } from '@/types'

export async function generateMusic(
  request: MusicGenerationRequest
): Promise<MusicGenerationResponse> {
  const response = await fetch(`${getBaseUrl()}/music/generate`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ ...request, output_format: 'url' }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.base_resp?.status_msg || error.error || 'Failed to generate music')
  }

  return response.json()
}

export async function preprocessMusic(
  audioFile: File
): Promise<MusicPreprocessResponse> {
  const formData = new FormData()
  formData.append('audio_file', audioFile)

  const response = await fetch(`${getBaseUrl()}/music/preprocess`, {
    method: 'POST',
    headers: {
      ...getHeaders(),
      // 不设置 Content-Type，让浏览器自动设置 multipart/form-data
    },
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to preprocess audio')
  }

  return response.json()
}
```

- [ ] **Step 2: Commit API 函数扩展**

```bash
git add src/lib/api/music.ts
git commit -m "feat(api): add preprocessMusic function for cover preprocessing"
```

---

## Task 6: 重构 MusicGeneration 页面 - 状态与验证

**Files:**
- Modify: `src/pages/MusicGeneration.tsx`

此任务较大，分为多个子步骤。

- [ ] **Step 1: 添加新状态变量**

在现有状态声明后添加：

```typescript
// src/pages/MusicGeneration.tsx
// 在 const [error, setError] 后添加

// 纯音乐模式
const [instrumental, setInstrumental] = useState(false)

// 高级设置
const [advancedOpen, setAdvancedOpen] = useState(false)
const [sampleRate, setSampleRate] = useState<44100 | 48000>(44100)
const [bitrate, setBitrate] = useState<'128k' | '192k' | '256k' | '320k'>('256k')
const [format, setFormat] = useState<'mp3' | 'wav' | 'flac'>('mp3')
const [seed, setSeed] = useState<string>('') // string 便于清空

// 翻唱模式
const [coverMode, setCoverMode] = useState<'one-step' | 'two-step'>('one-step')
const [referenceAudioUrl, setReferenceAudioUrl] = useState('')
const [useOriginalLyrics, setUseOriginalLyrics] = useState(true)
const [preprocessLoading, setPreprocessLoading] = useState(false)
const [preprocessResult, setPreprocessResult] = useState<{ lyrics: string; audio_url: string } | null>(null)
```

- [ ] **Step 2: 导入新组件**

修改 imports：

```typescript
// src/pages/MusicGeneration.tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Music, Download, Loader2, Wand2, RefreshCw, Lightbulb, Mic2, Music2, Upload, Link, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { PageHeader } from '@/components/shared/PageHeader'
import { Switch } from '@/components/ui/Switch'
import { Checkbox } from '@/components/ui/Checkbox'
import { Input } from '@/components/ui/Input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/Collapsible'
import { generateMusic, preprocessMusic } from '@/lib/api/music'
import { uploadMediaFromUrl } from '@/lib/api/media'
import { useHistoryStore } from '@/stores/history'
import { useUsageStore } from '@/stores/usage'
import { useSettingsStore } from '@/settings/store'
import { MUSIC_MODELS, MUSIC_TEMPLATES, STRUCTURE_TAGS, type MusicModel } from '@/types'
import { cn } from '@/lib/utils'
```

- [ ] **Step 3: 添加验证函数**

```typescript
// src/pages/MusicGeneration.tsx
// 在 clearAll 函数后添加

// 字符限制常量
const STYLE_PROMPT_MAX = 2000
const LYRICS_MAX = 3500

// 验证函数
const isStylePromptOverLimit = stylePrompt.length > STYLE_PROMPT_MAX
const isLyricsOverLimit = lyrics.length > LYRICS_MAX

// 纯音乐模式可用模型
const instrumentalModels = ['music-2.6', 'music-2.5+']
const isInstrumentalAvailable = instrumentalModels.includes(model)

// Seed 可用模型
const seedModels = ['music-2.6']
const isSeedAvailable = seedModels.includes(model)

// AI 歌词优化可用模型（修正为 2.5/2.5+/2.6）
const optimizeLyricsModels = ['music-2.5', 'music-2.5+', 'music-2.6']
const isOptimizeLyricsAvailable = optimizeLyricsModels.includes(model)

// 是否为翻唱模式
const isCoverModel = model === 'music-cover'

// 提交按钮禁用逻辑
const isSubmitDisabled = () => {
  if (isGenerating) return true
  if (isStylePromptOverLimit || isLyricsOverLimit) return true
  
  if (isCoverModel) {
    // 翻唱模式：一步需要 URL，两步需要预处理结果
    if (coverMode === 'one-step' && !referenceAudioUrl.trim()) return true
    if (coverMode === 'two-step' && !preprocessResult) return true
    return false
  }
  
  if (instrumental) {
    // 纯音乐模式：风格描述必填
    return !stylePrompt.trim()
  }
  
  // 普通模式：歌词必填
  return !lyrics.trim()
}
```

- [ ] **Step 4: Commit 状态与验证**

```bash
git add src/pages/MusicGeneration.tsx
git commit -m "feat(music): add state and validation for instrumental, seed, cover mode"
```

---

## Task 7: 重构 MusicGeneration 页面 - 纯音乐模式 UI

**Files:**
- Modify: `src/pages/MusicGeneration.tsx`

- [ ] **Step 1: 在模型选择器后添加纯音乐模式 Checkbox**

在 `Select` 组件后添加（约第 232 行后）：

```tsx
// src/pages/MusicGeneration.tsx
// 在 </Select> 后添加

{isInstrumentalAvailable && (
  <div className="flex items-center space-x-2 pt-2">
    <Checkbox
      id="instrumental"
      checked={instrumental}
      onCheckedChange={(checked) => setInstrumental(checked as boolean)}
    />
    <label
      htmlFor="instrumental"
      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
    >
      纯音乐模式（无歌词）
    </label>
  </div>
)}
```

- [ ] **Step 2: 修改歌词编辑器显示逻辑**

修改歌词编辑器 Card 的渲染条件：

```tsx
// src/pages/MusicGeneration.tsx
// 修改歌词编辑器 Card

{(!instrumental || !isInstrumentalAvailable) && !isCoverModel && (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Music2 className="w-5 h-5" />
        {t('musicGeneration.lyricsEditorTitle')}
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      {/* 结构标签按钮 */}
      <div className="flex flex-wrap gap-2">
        {STRUCTURE_TAGS.map(tag => (
          <Button
            key={tag}
            variant="outline"
            size="sm"
            onClick={() => insertTag(tag)}
          >
            {tag}
          </Button>
        ))}
      </div>
      
      {/* 歌词输入 */}
      <Textarea
        id="lyrics-editor"
        value={lyrics}
        onChange={(e) => setLyrics(e.target.value)}
        placeholder={t('musicGeneration.lyricsPlaceholder')}
        className={cn(
          "min-h-[300px] resize-none font-mono text-sm",
          isLyricsOverLimit && "border-red-500"
        )}
      />
      
      {/* 字符计数 */}
      <div className="flex items-center justify-between text-sm">
        <span className={cn(
          isLyricsOverLimit ? "text-red-500" : "text-muted-foreground"
        )}>
          {lyrics.length} / {LYRICS_MAX}
        </span>
        <span className="text-muted-foreground">{t('musicGeneration.useTags')}</span>
      </div>
    </CardContent>
  </Card>
)}
```

- [ ] **Step 3: 修改风格描述显示与验证**

```tsx
// src/pages/MusicGeneration.tsx
// 修改风格描述部分

<div className="space-y-2">
  <label className="text-sm font-medium text-foreground">
    {instrumental ? '风格描述 *' : t('musicGeneration.styleDescription')}
  </label>
  <Textarea
    value={stylePrompt}
    onChange={(e) => setStylePrompt(e.target.value)}
    placeholder={instrumental 
      ? '纯音乐模式需填写风格描述，定义音乐风格和段落结构'
      : t('musicGeneration.stylePlaceholder')
    }
    className={cn(
      "min-h-[80px] resize-none",
      isStylePromptOverLimit && "border-red-500"
    )}
  />
  <div className={cn(
    "text-xs",
    isStylePromptOverLimit ? "text-red-500" : "text-muted-foreground"
  )}>
    {stylePrompt.length} / {STYLE_PROMPT_MAX}
  </div>
</div>
```

- [ ] **Step 4: Commit 纯音乐模式 UI**

```bash
git add src/pages/MusicGeneration.tsx
git commit -m "feat(music): add instrumental mode checkbox and conditional lyrics display"
```

---

## Task 8: 重构 MusicGeneration 页面 - AI 歌词优化范围修正

**Files:**
- Modify: `src/pages/MusicGeneration.tsx`

- [ ] **Step 1: 修正 AI 歌词优化显示条件**

修改 AI 歌词优化的显示条件（约第 244 行）：

```tsx
// src/pages/MusicGeneration.tsx
// 修改 AI 歌词优化部分

{isOptimizeLyricsAvailable && !isCoverModel && !instrumental && (
  <div className="flex items-center justify-between">
    <div className="space-y-0.5">
      <label className="text-sm font-medium text-foreground">
        {t('musicGeneration.aiOptimizeLabel')}
      </label>
      <p className="text-xs text-muted-foreground">
        {t('musicGeneration.autoOptimizeLyrics')}
      </p>
    </div>
    <Switch
      checked={optimizeLyrics}
      onCheckedChange={setOptimizeLyrics}
    />
  </div>
)}
```

- [ ] **Step 2: Commit AI 歌词优化范围修正**

```bash
git add src/pages/MusicGeneration.tsx
git commit -m "fix(music): correct AI lyrics optimization availability to 2.5/2.5+/2.6"
```

---

## Task 9: 重构 MusicGeneration 页面 - 翻唱面板 UI

**Files:**
- Modify: `src/pages/MusicGeneration.tsx`

- [ ] **Step 1: 在模型选择器后添加翻唱面板**

当 model 为 `music-cover` 时显示翻唱面板：

```tsx
// src/pages/MusicGeneration.tsx
// 在 </Select> 后添加

{isCoverModel && (
  <Card className="mt-4">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Music className="w-5 h-5" />
        翻唱设置
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <Tabs value={coverMode} onValueChange={(v) => setCoverMode(v as 'one-step' | 'two-step')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="one-step">一步模式</TabsTrigger>
          <TabsTrigger value="two-step">两步模式</TabsTrigger>
        </TabsList>

        <TabsContent value="one-step" className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              参考音频 URL *
            </label>
            <Input
              value={referenceAudioUrl}
              onChange={(e) => setReferenceAudioUrl(e.target.value)}
              placeholder="https://example.com/song.mp3"
              type="url"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              翻唱风格描述
            </label>
            <Textarea
              value={stylePrompt}
              onChange={(e) => setStylePrompt(e.target.value)}
              placeholder="描述翻唱风格，如更悲伤、更激昂..."
              className="min-h-[60px] resize-none"
            />
            <div className={cn(
              "text-xs",
              isStylePromptOverLimit ? "text-red-500" : "text-muted-foreground"
            )}>
              {stylePrompt.length} / {STYLE_PROMPT_MAX}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="use-original"
              checked={useOriginalLyrics}
              onCheckedChange={(checked) => setUseOriginalLyrics(checked as boolean)}
            />
            <label htmlFor="use-original" className="text-sm">
              使用原歌词（自动提取）
            </label>
          </div>

          {!useOriginalLyrics && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                自定义歌词
              </label>
              <Textarea
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                placeholder="输入自定义翻唱歌词..."
                className={cn(
                  "min-h-[150px] resize-none font-mono text-sm",
                  isLyricsOverLimit && "border-red-500"
                )}
              />
              <div className={cn(
                "text-xs",
                isLyricsOverLimit ? "text-red-500" : "text-muted-foreground"
              )}>
                {lyrics.length} / {LYRICS_MAX}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="two-step" className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              上传参考音频
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept=".mp3,.wav,.flac"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handlePreprocess(file)
                }}
                className="flex-1"
              />
              {preprocessLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            </div>
            <p className="text-xs text-muted-foreground">
              支持 mp3/wav/flac 格式
            </p>
          </div>

          {preprocessResult && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                提取的歌词（可修改）
              </label>
              <Textarea
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                defaultValue={preprocessResult.lyrics}
                className={cn(
                  "min-h-[150px] resize-none font-mono text-sm",
                  isLyricsOverLimit && "border-red-500"
                )}
              />
              <div className={cn(
                "text-xs",
                isLyricsOverLimit ? "text-red-500" : "text-muted-foreground"
              )}>
                {lyrics.length} / {LYRICS_MAX}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              翻唱风格描述
            </label>
            <Textarea
              value={stylePrompt}
              onChange={(e) => setStylePrompt(e.target.value)}
              placeholder="描述翻唱风格..."
              className="min-h-[60px] resize-none"
            />
          </div>
        </TabsContent>
      </Tabs>
    </CardContent>
  </Card>
)}
```

- [ ] **Step 2: 添加预处理处理函数**

```typescript
// src/pages/MusicGeneration.tsx
// 在 handleGenerate 函数前添加

const handlePreprocess = async (file: File) => {
  setPreprocessLoading(true)
  setError(null)
  setPreprocessResult(null)

  try {
    const result = await preprocessMusic(file)
    setPreprocessResult(result)
    setLyrics(result.lyrics)
    setReferenceAudioUrl(result.audio_url)
  } catch (err) {
    setError(err instanceof Error ? err.message : '预处理失败')
  } finally {
    setPreprocessLoading(false)
  }
}
```

- [ ] **Step 3: Commit 翻唱面板 UI**

```bash
git add src/pages/MusicGeneration.tsx
git commit -m "feat(music): add music-cover panel with one-step and two-step modes"
```

---

## Task 10: 重构 MusicGeneration 页面 - 高级设置面板

**Files:**
- Modify: `src/pages/MusicGeneration.tsx`

- [ ] **Step 1: 在参数区域末尾添加高级设置折叠面板**

在生成按钮前添加：

```tsx
// src/pages/MusicGeneration.tsx
// 在 Button onClick=handleGenerate 前添加

<Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
  <CollapsibleTrigger icon={<Settings2 className="w-4 h-4" />}>
    高级设置
  </CollapsibleTrigger>
  <CollapsibleContent className="mt-2">
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">
          采样率
        </label>
        <Select
          value={sampleRate.toString()}
          onValueChange={(v) => setSampleRate(Number(v) as 44100 | 48000)}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="44100">44100 Hz</SelectItem>
            <SelectItem value="48000">48000 Hz</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">
          比特率
        </label>
        <Select
          value={bitrate}
          onValueChange={(v) => setBitrate(v as '128k' | '192k' | '256k' | '320k')}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="128k">128 kbps</SelectItem>
            <SelectItem value="192k">192 kbps</SelectItem>
            <SelectItem value="256k">256 kbps</SelectItem>
            <SelectItem value="320k">320 kbps</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">
          输出格式
        </label>
        <Select
          value={format}
          onValueChange={(v) => setFormat(v as 'mp3' | 'wav' | 'flac')}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mp3">MP3</SelectItem>
            <SelectItem value="wav">WAV</SelectItem>
            <SelectItem value="flac">FLAC</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">
          Seed {isSeedAvailable ? '' : '(仅 music-2.6)'}
        </label>
        <Input
          type="number"
          value={seed}
          onChange={(e) => setSeed(e.target.value)}
          placeholder="留空则随机"
          disabled={!isSeedAvailable}
          className="h-8"
        />
      </div>
    </div>
  </CollapsibleContent>
</Collapsible>
```

- [ ] **Step 2: Commit 高级设置面板**

```bash
git add src/pages/MusicGeneration.tsx
git commit -m "feat(music): add advanced settings collapsible panel"
```

---

## Task 11: 重构 MusicGeneration 页面 - handleGenerate 函数

**Files:**
- Modify: `src/pages/MusicGeneration.tsx`

- [ ] **Step 1: 重构 handleGenerate 函数**

```typescript
// src/pages/MusicGeneration.tsx
// 替换整个 handleGenerate 函数

const handleGenerate = async () => {
  if (isSubmitDisabled()) return

  setIsGenerating(true)
  setError(null)
  setAudioUrl(null)

  try {
    const request: MusicGenerationRequest = {
      model,
      output_format: 'url',
    }

    // 翻唱模式
    if (isCoverModel) {
      request.reference_audio_url = referenceAudioUrl
      if (!useOriginalLyrics && lyrics.trim()) {
        request.lyrics = lyrics.trim()
      }
      if (stylePrompt.trim()) {
        request.style_prompt = stylePrompt.trim()
      }
    } else {
      // 普通模式 / 纯音乐模式
      if (lyrics.trim()) {
        request.lyrics = lyrics.trim()
      }
      if (stylePrompt.trim()) {
        request.style_prompt = stylePrompt.trim()
      }
      if (optimizeLyrics && isOptimizeLyricsAvailable) {
        request.optimize_lyrics = true
      }
    }

    // 高级设置
    if (audio_setting) {
      request.audio_setting = {
        sample_rate: sampleRate,
        bitrate: bitrate,
        format: format,
      }
    }

    // Seed (仅 music-2.6)
    if (isSeedAvailable && seed.trim()) {
      request.seed = parseInt(seed, 10)
    }

    const response = await generateMusic(request)

    const audioData = response.data.audio
    // 根据 format 处理响应
    const mimeType = format === 'mp3' ? 'audio/mp3' 
      : format === 'wav' ? 'audio/wav' 
      : 'audio/flac'
    
    let blob: Blob
    if (audioData.startsWith('http')) {
      // URL 格式：直接使用
      blob = await fetch(audioData).then(r => r.blob())
    } else {
      // hex 格式：解码
      const byteArray = new Uint8Array(audioData.length / 2)
      for (let i = 0; i < audioData.length; i += 2) {
        byteArray[i / 2] = parseInt(audioData.substring(i, i + 2), 16)
      }
      blob = new Blob([byteArray], { type: mimeType })
    }
    
    const url = URL.createObjectURL(blob)
    setAudioUrl(url)
    setAudioDuration(response.data.duration)
    saveMusicToMedia(url)

    addUsage('musicRequests', 1)
    addItem({
      type: 'music',
      input: isCoverModel ? referenceAudioUrl : lyrics.trim(),
      outputUrl: url,
      metadata: {
        model,
        stylePrompt,
        optimizeLyrics,
        duration: response.data.duration,
        instrumental,
        seed: seed ? parseInt(seed, 10) : undefined,
      },
    })
  } catch (err) {
    setError(err instanceof Error ? err.message : t('musicGeneration.musicGenFailed'))
  } finally {
    setIsGenerating(false)
  }
}
```

- [ ] **Step 2: Commit handleGenerate 重构**

```bash
git add src/pages/MusicGeneration.tsx
git commit -m "feat(music): refactor handleGenerate for all new parameters"
```

---

## Task 12: 修改生成按钮禁用逻辑

**Files:**
- Modify: `src/pages/MusicGeneration.tsx`

- [ ] **Step 1: 更新生成按钮**

```tsx
// src/pages/MusicGeneration.tsx
// 替换生成按钮

<Button
  onClick={handleGenerate}
  disabled={isSubmitDisabled()}
  className="w-full"
  size="lg"
>
  {isGenerating ? (
    <>
      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      {t('musicGeneration.composing')}
    </>
  ) : (
    <>
      <Wand2 className="w-4 h-4 mr-2" />
      {t('musicGeneration.generateMusic')}
    </>
  )}
</Button>
```

- [ ] **Step 2: Commit 按钮更新**

```bash
git add src/pages/MusicGeneration.tsx
git commit -m "feat(music): update generate button with new validation logic"
```

---

## Task 13: 最终整合与验证

**Files:**
- All modified files

- [ ] **Step 1: 运行 TypeScript 类型检查**

```bash
npm run typecheck
# 预期：无错误
```

- [ ] **Step 2: 运行构建**

```bash
npm run build
# 预期：构建成功
```

- [ ] **Step 3: 手动测试关键功能**

启动开发服务器并测试：
1. 纯音乐模式：勾选后歌词可选，非支持模型禁用
2. Seed 参数：music-2.6 可用，其他模型禁用
3. AI 歌词优化：music-2.5/2.5+/2.6 都显示
4. 翻唱模式：切换到 music-cover 显示翻唱面板
5. 高级设置：折叠面板展开/关闭正常
6. 字符计数：超限时禁用提交

```bash
node scripts/dev.js start
node scripts/dev.js log
```

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(music): complete music generation enhancements

- Add instrumental mode for music-2.6/2.5+
- Add seed parameter for reproducibility (music-2.6 only)
- Add music-cover翻唱 mode with one-step and two-step flows
- Fix AI lyrics optimization availability to 2.5/2.5+/2.6
- Add advanced settings panel (sample_rate, bitrate, format, seed)
- Add character counters with validation (style 2000, lyrics 3500)
- Add Collapsible component for expandable panels
- Add preprocessMusic API for cover preprocessing"
```

---

## Self-Review Checklist

**Spec Coverage:**
- ✓ 纯音乐模式 (Task 7)
- ✓ Seed 参数 (Task 10, 11)
- ✓ AI 歌词优化范围修正 (Task 8)
- ✓ music-cover 翻唱一步模式 (Task 9)
- ✓ music-cover 翻唱两步模式 (Task 9)
- ✓ 高级设置面板 (Task 10)
- ✓ 字符计数器 (Task 6, 7, 9)

**Placeholder Scan:**
- ✓ 无 TBD/TODO
- ✓ 无 vague error handling
- ✓ 所有代码步骤有具体代码

**Type Consistency:**
- ✓ MusicGenerationRequest 扩展后各处使用一致
- ✓ sampleRate/bitrate/format 类型一致
- ✓ seed 作为 number/string 处理一致