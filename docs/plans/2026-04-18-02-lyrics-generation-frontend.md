# 歌词生成功能 - Frontend Generation 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现歌词生成前端页面，包括 API client、类型定义、生成页面和结果卡片组件。

**Architecture:** 参考 MusicGeneration 页面结构，使用 useFormPersistence 管理表单状态，RadioGroup 切换生成模式，LyricsTaskCard 显示结果。

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Zustand, i18next, framer-motion

**Spec:** @docs/specs/lyrics-generation-design.md
**Depends on:** @docs/plans/2026-04-18-01-lyrics-generation-backend.md

---

## File Structure

**Create:**
- `src/types/lyrics.ts` - 歌词类型定义
- `src/lib/api/lyrics.ts` - 歌词 API client
- `src/pages/LyricsGeneration.tsx` - 歌词生成页面
- `src/components/lyrics/LyricsTaskCard.tsx` - 结果卡片组件
- `src/components/lyrics/LyricsTaskCarousel.tsx` - 结果轮播组件

**Modify:**
- `src/types/index.ts` - export lyrics types
- `src/lib/config/constants.ts` - add LYRICS_GENERATION timeout
- `src/i18n/locales/zh.json` - add lyrics translations
- `src/i18n/locales/en.json` - add lyrics translations

---

## Task 1: Lyrics Types

**Files:**
- Create: `src/types/lyrics.ts`
- Modify: `src/types/index.ts`

- [ ] **Step 1: Create lyrics types file**

```typescript
// src/types/lyrics.ts

export type LyricsMode = 'write_full_song' | 'edit'

export interface LyricsGenerationRequest {
  mode?: LyricsMode
  prompt?: string       // max 2000 chars, for write_full_song
  lyrics?: string       // required for edit mode
  title?: string        // optional
}

export interface LyricsGenerationResponse {
  song_title: string
  style_tags: string[]
  lyrics: string
  base_resp: {
    status_code: number
    status_msg: string
  }
}

// Lyrics section structure for parsing
export interface LyricsSection {
  type: 'verse' | 'chorus' | 'bridge' | 'outro' | 'hook' | 'intro'
  number?: number       // Verse 1, Verse 2
  content: string
  startIndex: number    // position in full lyrics
}

// Task state for generation progress
export type LyricsTaskStatus = 'idle' | 'generating' | 'completed' | 'failed'

export interface LyricsTask {
  id: string
  status: LyricsTaskStatus
  result?: LyricsGenerationResponse
  error?: string
  request?: LyricsGenerationRequest
  createdAt: string
}
```

- [ ] **Step 2: Export from types/index.ts**

```typescript
// src/types/index.ts (add to exports)
export * from './lyrics'
```

- [ ] **Step 3: Verify types compile**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/types/lyrics.ts src/types/index.ts
git commit -m "feat(types): add lyrics generation types"
```

---

## Task 2: Lyrics API Client

**Files:**
- Create: `src/lib/api/lyrics.ts`
- Modify: `src/lib/config/constants.ts`

- [ ] **Step 1: Add timeout constant**

```typescript
// src/lib/config/constants.ts (add to TIMEOUTS object)
export const TIMEOUTS = {
  // ... existing timeouts
  LYRICS_GENERATION: 60000, // 1 minute
}
```

- [ ] **Step 2: Create lyrics API client**

```typescript
// src/lib/api/lyrics.ts

import { apiClient } from './client'
import { TIMEOUTS } from '@/lib/config/constants'
import type { LyricsGenerationRequest, LyricsGenerationResponse } from '@/types/lyrics'

export async function generateLyrics(
  request: LyricsGenerationRequest
): Promise<LyricsGenerationResponse> {
  const response = await apiClient.client_.post<LyricsGenerationResponse>(
    '/lyrics/generate',
    request,
    { timeout: TIMEOUTS.LYRICS_GENERATION }
  )
  return response.data
}
```

- [ ] **Step 3: Verify API client compiles**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/api/lyrics.ts src/lib/config/constants.ts
git commit -m "feat(api): add lyrics generation API client"
```

---

## Task 3: LyricsTaskCard Component

**Files:**
- Create: `src/components/lyrics/LyricsTaskCard.tsx`

- [ ] **Step 1: Create LyricsTaskCard component**

```tsx
// src/components/lyrics/LyricsTaskCard.tsx

import { motion } from 'framer-motion'
import { useState } from 'react'
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Download,
  RotateCcw,
  Edit3,
  FileText,
  Heart,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { status as statusTokens } from '@/themes/tokens'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { toastSuccess, toastError } from '@/lib/toast'
import type { LyricsTask, LyricsGenerationResponse } from '@/types/lyrics'

interface LyricsTaskCardProps {
  task: LyricsTask
  index: number
  onRetry: (index: number) => void
  onEdit: (result: LyricsGenerationResponse) => void
  onExport: (result: LyricsGenerationResponse) => void
}

const taskVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 30 },
  },
}

function getStatusIcon(status: LyricsTask['status']) {
  switch (status) {
    case 'idle':
      return (
        <div className="w-8 h-8 rounded-full bg-muted/10 flex items-center justify-center">
          <AlertCircle className="w-4 h-4 text-muted-foreground/70" />
        </div>
      )
    case 'generating':
      return (
        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', statusTokens.info.bgSubtle)}>
          <Loader2 className={cn('w-4 h-4 animate-spin', statusTokens.info.icon)} />
        </div>
      )
    case 'completed':
      return (
        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', statusTokens.success.bgSubtle)}>
          <CheckCircle className={cn('w-4 h-4', statusTokens.success.icon)} />
        </div>
      )
    case 'failed':
      return (
        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', statusTokens.error.bgSubtle)}>
          <XCircle className={cn('w-4 h-4', statusTokens.error.icon)} />
        </div>
      )
  }
}

function getStatusBadge(status: LyricsTask['status']) {
  switch (status) {
    case 'idle':
      return <Badge className="bg-muted/10 text-foreground border-muted/20">待生成</Badge>
    case 'generating':
      return <Badge className={cn(statusTokens.info.bgSubtle, statusTokens.info.text, statusTokens.info.border)}>生成中</Badge>
    case 'completed':
      return <Badge className={cn(statusTokens.success.bgSubtle, statusTokens.success.text, statusTokens.success.border)}>已完成</Badge>
    case 'failed':
      return <Badge className={cn(statusTokens.error.bgSubtle, statusTokens.error.text, statusTokens.error.border)}>失败</Badge>
  }
}

function truncateLyrics(lyrics: string, maxLines: number = 4): string {
  const lines = lyrics.split('\n').slice(0, maxLines)
  return lines.join('\n')
}

export function LyricsTaskCard({
  task,
  index,
  onRetry,
  onEdit,
  onExport,
}: LyricsTaskCardProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    if (!task.result) return
    setIsExporting(true)
    try {
      onExport(task.result)
      toastSuccess('歌词已导出')
    } catch (error) {
      toastError('导出失败')
    } finally {
      setIsExporting(false)
    }
  }

  const progressColor = task.status === 'generating' 
    ? statusTokens.info.gradient 
    : task.status === 'completed'
      ? statusTokens.success.gradient
      : task.status === 'failed'
        ? statusTokens.error.gradient
        : 'from-muted/40 to-muted-foreground/70/40'

  return (
    <motion.div
      variants={taskVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        'relative rounded-xl border bg-card overflow-hidden',
        'hover:shadow-lg transition-shadow duration-200',
        'group'
      )}
    >
      {/* Gradient border glow on hover */}
      <div className={cn(
        'absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300',
        'bg-gradient-to-r',
        progressColor,
        'blur-sm -z-10'
      )} />

      {/* Header: status + title */}
      <div className="p-4 flex items-start gap-3">
        {getStatusIcon(task.status)}
        <div className="flex-1 min-w-0">
          {task.result ? (
            <>
              <h3 className="text-sm font-medium truncate">
                {task.result.song_title || '未命名歌曲'}
              </h3>
              {task.result.style_tags.length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {task.result.style_tags.slice(0, 3).map((tag, i) => (
                    <span 
                      key={i}
                      className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-muted-foreground">
              {task.status === 'generating' ? '正在创作歌词...' : '等待生成'}
            </div>
          )}
        </div>
        {getStatusBadge(task.status)}
      </div>

      {/* Lyrics preview */}
      {task.result && (
        <div className="px-4 pb-3">
          <div className="text-xs text-muted-foreground bg-muted/30 rounded p-2 max-h-24 overflow-hidden">
            <pre className="whitespace-pre-wrap font-sans">
              {truncateLyrics(task.result.lyrics)}
            </pre>
          </div>
        </div>
      )}

      {/* Error message */}
      {task.status === 'failed' && task.error && (
        <div className="px-4 pb-3">
          <p className="text-xs text-destructive">{task.error}</p>
        </div>
      )}

      {/* Progress bar */}
      {task.status === 'generating' && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
          <div 
            className={cn('h-full bg-gradient-to-r animate-pulse', progressColor)}
            style={{ width: '60%' }}
          />
        </div>
      )}

      {/* Actions */}
      {task.result && (
        <div className="px-4 pb-4 flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit(task.result)}
            className="flex items-center gap-1"
          >
            <Edit3 className="w-3 h-3" />
            编辑此歌词
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-1"
          >
            <Download className="w-3 h-3" />
            导出 TXT
          </Button>
        </div>
      )}

      {/* Retry button */}
      {task.status === 'failed' && (
        <div className="px-4 pb-4">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onRetry(index)}
            className="flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            重试
          </Button>
        </div>
      )}
    </motion.div>
  )
}
```

- [ ] **Step 2: Verify component compiles**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/lyrics/LyricsTaskCard.tsx
git commit -m "feat(components): add LyricsTaskCard component"
```

---

## Task 4: LyricsTaskCarousel Component

**Files:**
- Create: `src/components/lyrics/LyricsTaskCarousel.tsx`

- [ ] **Step 1: Create carousel component**

```tsx
// src/components/lyrics/LyricsTaskCarousel.tsx

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { LyricsTaskCard } from './LyricsTaskCard'
import type { LyricsTask, LyricsGenerationResponse } from '@/types/lyrics'

interface LyricsTaskCarouselProps {
  tasks: LyricsTask[]
  currentIndex: number
  onIndexChange: (index: number) => void
  onRetry: (index: number) => void
  onEdit: (result: LyricsGenerationResponse) => void
  onExport: (result: LyricsGenerationResponse) => void
}

export function LyricsTaskCarousel({
  tasks,
  currentIndex,
  onIndexChange,
  onRetry,
  onEdit,
  onExport,
}: LyricsTaskCarouselProps) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        点击"生成歌词"开始创作
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Navigation arrows */}
      {tasks.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10"
            onClick={() => onIndexChange(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10"
            onClick={() => onIndexChange(Math.min(tasks.length - 1, currentIndex + 1))}
            disabled={currentIndex === tasks.length - 1}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </>
      )}

      {/* Task cards */}
      <div className="overflow-hidden px-8">
        <div 
          className="flex transition-transform duration-200"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {tasks.map((task, index) => (
            <div key={task.id} className="w-full flex-shrink-0 px-2">
              <LyricsTaskCard
                task={task}
                index={index}
                onRetry={onRetry}
                onEdit={onEdit}
                onExport={onExport}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Status indicators */}
      {tasks.length > 1 && (
        <div className="flex justify-center gap-1 mt-4">
          {tasks.map((task, index) => (
            <div
              key={task.id}
              className={cn(
                'w-2 h-2 rounded-full transition-colors cursor-pointer',
                index === currentIndex ? 'bg-primary' : 'bg-muted',
                task.status === 'completed' && 'bg-success',
                task.status === 'failed' && 'bg-destructive',
                task.status === 'generating' && 'bg-info animate-pulse'
              )}
              onClick={() => onIndexChange(index)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify component compiles**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/lyrics/LyricsTaskCarousel.tsx
git commit -m "feat(components): add LyricsTaskCarousel component"
```

---

## Task 5: LyricsGeneration Page (Core Structure)

**Files:**
- Create: `src/pages/LyricsGeneration.tsx`

- [ ] **Step 1: Create page skeleton**

```tsx
// src/pages/LyricsGeneration.tsx

import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { FileText, Loader2, Wand2, Edit3 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { PageHeader } from '@/components/shared/PageHeader'
import { RadioGroup, RadioGroupItem } from '@/components/ui/RadioGroup'
import { Label } from '@/components/ui/Label'
import { cn } from '@/lib/utils'
import { generateLyrics } from '@/lib/api/lyrics'
import { toastSuccess, toastError } from '@/lib/toast'
import { useFormPersistence, DEBUG_FORM_KEYS } from '@/hooks'
import { LyricsTaskCarousel } from '@/components/lyrics/LyricsTaskCarousel'
import type { LyricsMode, LyricsTask, LyricsGenerationResponse, LyricsGenerationRequest } from '@/types/lyrics'

type LyricsFormData = {
  mode: LyricsMode
  prompt: string
  lyrics: string
  title: string
}

const DEFAULT_FORM: LyricsFormData = {
  mode: 'write_full_song',
  prompt: '',
  lyrics: '',
  title: '',
}

// Export lyrics to txt file
function exportLyricsToTxt(result: LyricsGenerationResponse) {
  const content = result.lyrics
  const filename = `${result.song_title || 'lyrics'}.txt`
  
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function LyricsGeneration() {
  const { t } = useTranslation()
  
  const [formData, setFormData] = useFormPersistence<LyricsFormData>({
    storageKey: DEBUG_FORM_KEYS.LYRICS_GENERATION,
    defaultValue: DEFAULT_FORM,
  })

  const updateForm = useCallback((key: keyof LyricsFormData, value: LyricsFormData[keyof LyricsFormData]) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }, [setFormData])

  const { mode, prompt, lyrics, title } = formData

  const [tasks, setTasks] = useState<LyricsTask[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)

  // Generate lyrics
  const handleGenerate = async () => {
    // Validation
    if (mode === 'edit' && !lyrics.trim()) {
      toastError('编辑模式需要输入歌词')
      return
    }
    if (mode === 'write_full_song' && !prompt.trim()) {
      toastError('创作模式需要输入创作提示')
      return
    }
    if (prompt.length > 2000) {
      toastError('创作提示不能超过2000字符')
      return
    }

    const taskId = `lyrics-${Date.now()}`
    const newTask: LyricsTask = {
      id: taskId,
      status: 'generating',
      request: { mode, prompt, lyrics, title },
      createdAt: new Date().toISOString(),
    }

    setTasks(prev => [newTask, ...prev])
    setCurrentIndex(0)
    setIsGenerating(true)

    try {
      const request: LyricsGenerationRequest = {
        mode,
        prompt: mode === 'write_full_song' ? prompt : undefined,
        lyrics: mode === 'edit' ? lyrics : undefined,
        title,
      }

      const result = await generateLyrics(request)

      setTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { ...task, status: 'completed', result }
          : task
      ))
      toastSuccess('歌词生成完成')
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '生成失败'
      setTasks(prev => prev.map(task =>
        task.id === taskId
          ? { ...task, status: 'failed', error: errorMsg }
          : task
      ))
      toastError(errorMsg)
    } finally {
      setIsGenerating(false)
    }
  }

  // Retry failed task
  const handleRetry = async (index: number) => {
    const task = tasks[index]
    if (!task.request) return

    const taskId = `lyrics-${Date.now()}`
    const newTask: LyricsTask = {
      id: taskId,
      status: 'generating',
      request: task.request,
      createdAt: new Date().toISOString(),
    }

    setTasks(prev => {
      const updated = [...prev]
      updated[index] = newTask
      return updated
    })
    setIsGenerating(true)

    try {
      const result = await generateLyrics(task.request)
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, status: 'completed', result } : t
      ))
      toastSuccess('歌词生成完成')
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '生成失败'
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, status: 'failed', error: errorMsg } : t
      ))
      toastError(errorMsg)
    } finally {
      setIsGenerating(false)
    }
  }

  // Edit this lyrics - switch to edit mode with lyrics filled
  const handleEdit = (result: LyricsGenerationResponse) => {
    updateForm('mode', 'edit')
    updateForm('lyrics', result.lyrics)
    updateForm('title', result.song_title)
    updateForm('prompt', '') // clear prompt for edit mode
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <PageHeader
        title={t('lyrics.title')}
        subtitle="AI 辅助歌词创作与优化"
        icon={<FileText className="w-5 h-5" />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Left: Form */}
        <div className="space-y-4">
          {/* Mode selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">生成模式</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={mode}
                onValueChange={(value: LyricsMode) => updateForm('mode', value)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="write_full_song" id="mode-write" />
                  <Label htmlFor="mode-write" className="flex items-center gap-1">
                    <Wand2 className="w-3 h-3" />
                    {t('lyrics.modeWrite')}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="edit" id="mode-edit" />
                  <Label htmlFor="mode-edit" className="flex items-center gap-1">
                    <Edit3 className="w-3 h-3" />
                    {t('lyrics.modeEdit')}
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Parameters */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">参数配置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Title (optional for both modes) */}
              <div className="space-y-2">
                <Label>{t('lyrics.titleInput')}</Label>
                <Input
                  value={title}
                  onChange={(e) => updateForm('title', e.target.value)}
                  placeholder="歌曲标题（可选）"
                  maxLength={100}
                />
              </div>

              {/* Prompt (write_full_song mode) */}
              {mode === 'write_full_song' && (
                <div className="space-y-2">
                  <Label>{t('lyrics.prompt')}</Label>
                  <Textarea
                    value={prompt}
                    onChange={(e) => updateForm('prompt', e.target.value)}
                    placeholder={t('lyrics.promptPlaceholder')}
                    maxLength={2000}
                    rows={4}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {prompt.length}/2000 {t('common.characters')}
                  </p>
                </div>
              )}

              {/* Lyrics input (edit mode) */}
              {mode === 'edit' && (
                <div className="space-y-2">
                  <Label>{t('lyrics.lyricsInput')}</Label>
                  <Textarea
                    value={lyrics}
                    onChange={(e) => updateForm('lyrics', e.target.value)}
                    placeholder={t('lyrics.lyricsPlaceholder')}
                    rows={8}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {lyrics.length} {t('common.characters')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Generate button */}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                {t('common.generating')}
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                {t('lyrics.generate')}
              </>
            )}
          </Button>
        </div>

        {/* Right: Results */}
        <div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t('lyrics.result')}</CardTitle>
            </CardHeader>
            <CardContent>
              <LyricsTaskCarousel
                tasks={tasks}
                currentIndex={currentIndex}
                onIndexChange={setCurrentIndex}
                onRetry={handleRetry}
                onEdit={handleEdit}
                onExport={exportLyricsToTxt}
              />
            </CardContent>
          </Card>

          {/* History note */}
          {tasks.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              最近生成的歌词（最多保留10条）
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify page compiles**

Run: `npm run build`
Expected: PASS (may have missing route/i18n warnings, that's expected)

- [ ] **Step 3: Commit**

```bash
git add src/pages/LyricsGeneration.tsx
git commit -m "feat(pages): add LyricsGeneration page"
```

---

## Task 6: i18n Translations

**Files:**
- Modify: `src/i18n/locales/zh.json`
- Modify: `src/i18n/locales/en.json`

- [ ] **Step 1: Add Chinese translations**

```json
// src/i18n/locales/zh.json (add "lyrics" section after "sidebar")
{
  "lyrics": {
    "title": "歌词生成",
    "modeWrite": "创作模式",
    "modeEdit": "编辑模式",
    "prompt": "创作提示",
    "promptPlaceholder": "描述你想要的歌词风格、主题、情感...",
    "lyricsInput": "待编辑歌词",
    "lyricsPlaceholder": "输入需要优化的歌词...",
    "titleInput": "歌曲标题",
    "generate": "生成歌词",
    "result": "生成结果",
    "styleTags": "风格标签",
    "exportTxt": "导出 TXT",
    "editThis": "编辑此歌词"
  }
}
```

Also add to sidebar section:
```json
// src/i18n/locales/zh.json (add to "sidebar" object)
"sidebar": {
  // ... existing keys
  "lyricsGeneration": "歌词生成"
}
```

- [ ] **Step 2: Add English translations**

```json
// src/i18n/locales/en.json (add "lyrics" section)
{
  "lyrics": {
    "title": "Lyrics Generation",
    "modeWrite": "Write Mode",
    "modeEdit": "Edit Mode",
    "prompt": "Creation Prompt",
    "promptPlaceholder": "Describe the lyrics style, theme, emotion you want...",
    "lyricsInput": "Lyrics to Edit",
    "lyricsPlaceholder": "Enter lyrics to optimize...",
    "titleInput": "Song Title",
    "generate": "Generate Lyrics",
    "result": "Result",
    "styleTags": "Style Tags",
    "exportTxt": "Export TXT",
    "editThis": "Edit This Lyrics"
  }
}
```

Also add to sidebar section:
```json
// src/i18n/locales/en.json (add to "sidebar" object)
"sidebar": {
  // ... existing keys
  "lyricsGeneration": "Lyrics Generation"
}
```

- [ ] **Step 3: Verify translations compile**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/i18n/locales/zh.json src/i18n/locales/en.json
git commit -m "feat(i18n): add lyrics translations"
```

---

## Task 7: Final Verification

- [ ] **Step 1: Run frontend tests**

Run: `vitest run src/`
Expected: All tests pass (or pre-existing failures noted)

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: Exit code 0

- [ ] **Step 3: Check TypeScript diagnostics**

Run: `npx tsc --noEmit`
Expected: No errors

---

## Completion Checklist

- [ ] Lyrics types created and exported
- [ ] Lyrics API client functional
- [ ] LyricsTaskCard component renders correctly
- [ ] LyricsTaskCarousel navigation works
- [ ] LyricsGeneration page form + results display
- [ ] i18n translations added (zh + en)
- [ ] All tests pass
- [ ] Build succeeds
- [ ] All changes committed