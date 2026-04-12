# 并行图片生成功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为图片生成页面添加标题名称支持和批量并发生成功能

**Architecture:** 纯前端实现，参考音乐生成组件结构。创建 ImageCarousel 和 ImageTaskCard 组件，改造 ImageGeneration.tsx 添加并发状态和逻辑。

**Tech Stack:** React, TypeScript, Framer Motion, Tailwind CSS

---

## 文件结构

| 文件 | 责责 |
|------|------|
| `src/components/image/ImageCarousel.tsx` | 新建 - 蛇播容器组件 |
| `src/components/image/ImageTaskCard.tsx` | 新建 - 单个任务卡片组件 |
| `src/pages/ImageGeneration.tsx` | 修改 - 添加标题、并发状态和逻辑 |

---

### Task 1: 创建 ImageTask 类型定义和 ImageTaskCard 组件

**Files:**
- Create: `src/components/image/ImageTaskCard.tsx`

- [ ] **Step 1: 创建 ImageTaskCard.tsx 文件**

创建文件并实现类型和组件，参考 MusicTaskCard.tsx：

```typescript
import { motion } from 'framer-motion'
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Download,
  RotateCcw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { status as statusTokens, services } from '@/themes/tokens'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

export type ImageTaskStatus = 'idle' | 'generating' | 'completed' | 'failed'

export interface ImageTask {
  id: string
  status: ImageTaskStatus
  progress: number
  imageUrl?: string
  error?: string
  retryCount: number
}

interface ImageTaskCardProps {
  task: ImageTask
  index: number
  onRetry: (index: number) => void
  onDownload: (imageUrl: string, filename: string) => void
}

const taskVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
  },
}

function getStatusIcon(status: ImageTaskStatus) {
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
    default:
      return (
        <div className="w-8 h-8 rounded-full bg-muted/10 flex items-center justify-center">
          <AlertCircle className="w-4 h-4 text-muted-foreground/70" />
        </div>
      )
  }
}

function getStatusBadge(status: ImageTaskStatus) {
  switch (status) {
    case 'idle':
      return <Badge className="bg-muted/10 text-foreground border-muted/20">待生成</Badge>
    case 'generating':
      return (
        <Badge className={cn(statusTokens.info.bgSubtle, statusTokens.info.text, statusTokens.info.border, 'hover:bg-info/20')}>
          生成中
        </Badge>
      )
    case 'completed':
      return (
        <Badge className={cn(statusTokens.success.bgSubtle, statusTokens.success.text, statusTokens.success.border, 'hover:bg-success/20')}>
          已完成
        </Badge>
      )
    case 'failed':
      return (
        <Badge className={cn(statusTokens.error.bgSubtle, statusTokens.error.text, statusTokens.error.border, 'hover:bg-error/20')}>
          失败
        </Badge>
      )
    default:
      return <Badge className="bg-muted/10 text-foreground border-muted/20">未知</Badge>
  }
}

function getProgressColor(status: ImageTaskStatus) {
  switch (status) {
    case 'generating':
      return statusTokens.info.gradient
    case 'completed':
      return statusTokens.success.gradient
    case 'failed':
      return statusTokens.error.gradient
    default:
      return 'from-muted/40 to-muted-foreground/70/40'
  }
}

export function ImageTaskCard({ task, index, onRetry, onDownload }: ImageTaskCardProps) {
  return (
    <motion.div
      variants={taskVariants}
      initial="hidden"
      animate="visible"
      layout
      className="group relative"
    >
      {task.status === 'generating' && (
        <div className={cn('absolute inset-0 blur-xl rounded-2xl animate-pulse', statusTokens.info.bgSubtle)} />
      )}

      <div
        className={`relative overflow-hidden rounded-xl border transition-all duration-300 ${
          task.status === 'completed'
            ? cn('bg-card/80', statusTokens.success.border)
            : task.status === 'generating'
              ? cn('bg-card/80', statusTokens.info.border)
              : task.status === 'failed'
                ? cn('bg-card/80', statusTokens.error.border)
                : 'bg-card/60 border-border/50'
        }`}
      >
        <div
          className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r ${getProgressColor(task.status)} transition-all duration-500`}
          style={{ width: `${task.progress}%` }}
        />

        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon(task.status)}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-foreground">#{index + 1}</span>
                  {getStatusBadge(task.status)}
                </div>
                {task.retryCount > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">已重试 {task.retryCount} 次</p>
                )}
              </div>
            </div>
          </div>

          {task.status === 'generating' && (
            <div className={cn('flex items-center gap-2 text-xs', statusTokens.info.text)}>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>正在生成图片，请稍候...</span>
            </div>
          )}

          {task.status === 'completed' && task.imageUrl && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className={cn('relative rounded-lg overflow-hidden', services.image.bg)}>
                <img
                  src={task.imageUrl}
                  alt={`Generated image ${index + 1}`}
                  className="w-full object-contain max-h-64"
                />
              </div>
              
              <Button
                onClick={() => onDownload(task.imageUrl!, `image-${task.id}.png`)}
                variant="outline"
                className={cn('w-full', services.image.bg, services.image.text, 'hover:opacity-80')}
              >
                <Download className="w-4 h-4 mr-2" />
                下载图片
              </Button>
            </motion.div>
          )}

          {task.status === 'failed' && task.error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div className={cn('flex items-center gap-2 p-3 rounded-lg', statusTokens.error.bgSubtle, statusTokens.error.border)}>
                <XCircle className={cn('w-4 h-4 shrink-0', statusTokens.error.icon)} />
                <p className={cn('text-sm', statusTokens.error.text)}>{task.error}</p>
              </div>
              
              <Button onClick={() => onRetry(index)} variant="outline" className="w-full">
                <RotateCcw className="w-4 h-4 mr-2" />
                重试生成
              </Button>
              
              {task.retryCount >= 3 && (
                <p className="text-xs text-muted-foreground text-center">已多次重试失败，建议检查参数或稍后重试</p>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
```

- [ ] **Step 2: 检查文件无 TypeScript 错误**

Run: `npx tsc --noEmit src/components/image/ImageTaskCard.tsx`

Expected: 无错误输出

- [ ] **Step 3: 提交文件**

```bash
git add src/components/image/ImageTaskCard.tsx
git commit -m "feat(image): add ImageTaskCard component"
```

---

### Task 2: 创建 ImageCarousel 轮播组件

**Files:**
- Create: `src/components/image/ImageCarousel.tsx`

- [ ] **Step 1: 创建 ImageCarousel.tsx 文件**

创建文件并实现轮播组件，参考 MusicCarousel.tsx：

```typescript
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ImageTaskCard } from './ImageTaskCard'
import type { ImageTask } from './ImageTaskCard'

export type { ImageTask }

interface ImageCarouselProps {
  tasks: ImageTask[]
  currentIndex: number
  onIndexChange: (index: number) => void
  onRetry: (index: number) => void
  onDownload: (imageUrl: string, filename: string) => void
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
}

export function ImageCarousel({
  tasks,
  currentIndex,
  onIndexChange,
  onRetry,
  onDownload,
}: ImageCarouselProps) {
  const [direction, setDirection] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (tasks.length <= 1) return
      if (!containerRef.current?.contains(document.activeElement)) return
      
      if (e.key === 'ArrowLeft') {
        setDirection(-1)
        onIndexChange(Math.max(0, currentIndex - 1))
      } else if (e.key === 'ArrowRight') {
        setDirection(1)
        onIndexChange(Math.min(tasks.length - 1, currentIndex + 1))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, tasks.length, onIndexChange])

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setDirection(-1)
      onIndexChange(currentIndex - 1)
    }
  }

  const goToNext = () => {
    if (currentIndex < tasks.length - 1) {
      setDirection(1)
      onIndexChange(currentIndex + 1)
    }
  }

  const completedCount = tasks.filter(t => t.status === 'completed').length
  const failedCount = tasks.filter(t => t.status === 'failed').length

  if (tasks.length === 0) {
    return null
  }

  return (
    <div className="space-y-4" ref={containerRef} tabIndex={-1}>
      <div className="relative">
        {tasks.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              disabled={currentIndex === 0}
              className={cn(
                "absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10",
                "p-2 rounded-lg bg-card/80 border border-border hover:bg-card transition-colors",
                currentIndex === 0 && "opacity-50 cursor-not-allowed"
              )}
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>
            
            <button
              onClick={goToNext}
              disabled={currentIndex === tasks.length - 1}
              className={cn(
                "absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10",
                "p-2 rounded-lg bg-card/80 border border-border hover:bg-card transition-colors",
                currentIndex === tasks.length - 1 && "opacity-50 cursor-not-allowed"
              )}
            >
              <ChevronRight className="w-5 h-5 text-foreground" />
            </button>
          </>
        )}

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="w-full"
          >
            <ImageTaskCard
              task={tasks[currentIndex]}
              index={currentIndex}
              onRetry={onRetry}
              onDownload={onDownload}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {tasks.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-2"
        >
          <span className="text-sm text-muted-foreground mr-2">
            [{currentIndex + 1}/{tasks.length}]
          </span>
          
          <div className="flex items-center gap-1">
            {tasks.map((task, index) => (
              <button
                key={task.id}
                onClick={() => {
                  setDirection(index > currentIndex ? 1 : -1)
                  onIndexChange(index)
                }}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-200",
                  index === currentIndex && "w-3 h-3",
                  task.status === 'completed' && "bg-success",
                  task.status === 'generating' && "bg-info animate-pulse",
                  task.status === 'failed' && "bg-error",
                  task.status === 'idle' && "bg-muted-foreground/30"
                )}
                aria-label={`跳转到任务 ${index + 1}`}
              />
            ))}
          </div>
          
          {completedCount > 0 && (
            <span className="text-xs text-success ml-2">{completedCount} 完成</span>
          )}
          {failedCount > 0 && (
            <span className="text-xs text-error ml-2">{failedCount} 失败</span>
          )}
        </motion.div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 检查文件无 TypeScript 错误**

Run: `npx tsc --noEmit src/components/image/ImageCarousel.tsx`

Expected: 无错误输出

- [ ] **Step 3: 提交文件**

```bash
git add src/components/image/ImageCarousel.tsx
git commit -m "feat(image): add ImageCarousel component"
```

---

### Task 3: 修改 ImageGeneration.tsx - 添加状态和导入

**Files:**
- Modify: `src/pages/ImageGeneration.tsx`

- [ ] **Step 1: 添加导入语句**

在文件顶部导入区域添加（约第1-19行之间）：

```typescript
// 在现有导入后添加
import { ImageCarousel } from '@/components/image/ImageCarousel'
import type { ImageTask } from '@/components/image/ImageTaskCard'
```

- [ ] **Step 2: 添加新状态变量**

在现有 useState 声明后（约第62-77行之后），添加新状态：

```typescript
  // 并发生成相关状态
  const [imageTitle, setImageTitle] = useState('')
  const [tasks, setTasks] = useState<ImageTask[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [parallelCount, setParallelCount] = useState(1)
```

- [ ] **Step 3: 添加 updateTask 函数**

在状态声明后添加 updateTask 函数（参考 MusicGeneration.tsx 第128-134行）：

```typescript
  const updateTask = useCallback((index: number, updates: Partial<ImageTask>) => {
    setTasks(prev => {
      const newTasks = [...prev]
      newTasks[index] = { ...newTasks[index], ...updates }
      return newTasks
    })
  }, [])
```

- [ ] **Step 4: 添加 retryTask 函数**

添加单个任务重试函数：

```typescript
  const retryTask = async (index: number) => {
    const task = tasks[index]
    if (task.status !== 'failed') return

    updateTask(index, {
      status: 'generating',
      progress: 25,
      error: undefined,
      retryCount: task.retryCount + 1,
    })

    try {
      const response = await generateImage({
        model,
        prompt: prompt.trim(),
        n: 1, // 并发模式固定为1
        aspect_ratio: aspectRatio,
        seed,
      })

      const url = response.data[0]?.url || ''
      updateTask(index, {
        status: 'completed',
        progress: 100,
        imageUrl: url,
      })

      // 使用标题命名保存
      await saveImageToMedia(url, imageTitle, tasks.length > 1 ? index : undefined)
      addUsage('imageRequests', 1)
    } catch (err) {
      updateTask(index, {
        status: 'failed',
        progress: 100,
        error: err instanceof Error ? err.message : '生成失败',
      })
    }
  }
```

- [ ] **Step 5: 检查 TypeScript 错误**

Run: `npx tsc --noEmit src/pages/ImageGeneration.tsx`

Expected: 无新增错误

---

### Task 4: 修改 saveImageToMedia 函数支持标题命名

**Files:**
- Modify: `src/pages/ImageGeneration.tsx` (saveImageToMedia 函数，约第110-121行)

- [ ] **Step 1: 修改 saveImageToMedia 函数签名和逻辑**

替换现有 saveImageToMedia 函数（第110-121行）：

```typescript
  const saveImageToMedia = async (imageUrl: string, title?: string, index?: number): Promise<void> => {
    try {
      let filename: string
      if (title && title.trim()) {
        const sanitizedTitle = title.trim().replace(/[^\w\u4e00-\u9fa5\-]/g, '_')
        if (index !== undefined) {
          filename = `${sanitizedTitle} (${index + 1}).png`
        } else {
          filename = `${sanitizedTitle}.png`
        }
      } else {
        filename = `image_${Date.now()}.png`
      }
      await uploadMediaFromUrl(
        imageUrl,
        filename,
        'image',
        'image_generation'
      )
    } catch (error) {
      console.error('Failed to save image:', error)
    }
  }
```

- [ ] **Step 2: 检查 TypeScript 错误**

Run: `npx tsc --noEmit src/pages/ImageGeneration.tsx`

Expected: 无错误

- [ ] **Step 3: 提交更改**

```bash
git add src/pages/ImageGeneration.tsx
git commit -m "feat(image): add title support for image saving"
```

---

### Task 5: 修改 handleGenerate 函数支持并发

**Files:**
- Modify: `src/pages/ImageGeneration.tsx` (handleGenerate 函数，约第123-167行)

- [ ] **Step 1: 重写 handleGenerate 函数**

替换现有 handleGenerate 函数，添加并发逻辑：

```typescript
  const handleGenerate = async () => {
    if (!prompt.trim()) return

    setError(null)

    // 根据并发数量选择执行模式
    if (parallelCount === 1) {
      // 单请求模式（保持原有逻辑）
      setIsGenerating(true)
      setGeneratedImages([])

      try {
        const response = await generateImage({
          model,
          prompt: prompt.trim(),
          n: numImages as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9,
          aspect_ratio: aspectRatio,
          seed,
        })

        const urls = response.data.map(d => d.url || '')
        setGeneratedImages(urls)

        addUsage('imageRequests', numImages)
        urls.forEach((url, index) => {
          addItem({
            type: 'image',
            input: prompt.trim(),
            outputUrl: url,
            metadata: {
              model,
              aspectRatio,
              seed,
              index: index + 1,
              total: urls.length,
            },
          })
        })

        if (urls.length > 0) {
          for (const url of urls) {
            await saveImageToMedia(url, imageTitle)
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '生成失败')
      } finally {
        setIsGenerating(false)
      }
    } else {
      // 并发模式
      const newTasks: ImageTask[] = Array.from({ length: parallelCount }, (_, i) => ({
        id: `${Date.now()}-${i}`,
        status: 'idle' as const,
        progress: 0,
        retryCount: 0,
      }))
      setTasks(newTasks)
      setCurrentIndex(0)

      const promises = newTasks.map(async (task, index) => {
        updateTask(index, { status: 'generating', progress: 25 })

        try {
          const response = await generateImage({
            model,
            prompt: prompt.trim(),
            n: 1, // 并发模式固定为1
            aspect_ratio: aspectRatio,
            seed,
          })

          const url = response.data[0]?.url || ''
          updateTask(index, {
            status: 'completed',
            progress: 100,
            imageUrl: url,
          })

          await saveImageToMedia(url, imageTitle, index)
          addUsage('imageRequests', 1)
          addItem({
            type: 'image',
            input: prompt.trim(),
            outputUrl: url,
            metadata: {
              model,
              aspectRatio,
              seed,
              index: index + 1,
              total: parallelCount,
              parallel: true,
            },
          })

          return { success: true, index }
        } catch (err) {
          updateTask(index, {
            status: 'failed',
            progress: 100,
            error: err instanceof Error ? err.message : '生成失败',
          })
          return { success: false, index }
        }
      })

      await Promise.allSettled(promises)
    }
  }
```

- [ ] **Step 2: 检查 TypeScript 错误**

Run: `npx tsc --noEmit src/pages/ImageGeneration.tsx`

Expected: 无错误

- [ ] **Step 3: 提交更改**

```bash
git add src/pages/ImageGeneration.tsx
git commit -m "feat(image): add parallel generation support"
```

---

### Task 6: 添加 UI 组件 - 标题输入和并发数量选择

**Files:**
- Modify: `src/pages/ImageGeneration.tsx`

- [ ] **Step 1: 在 Prompt 输入区域后添加标题输入框**

在 Prompt Card 内的 Textarea 后（约第252行之后），添加标题输入：

```typescript
                {/* 标题输入 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">图片标题（可选，用于保存文件命名）</label>
                  <Input
                    value={imageTitle}
                    onChange={(e) => setImageTitle(e.target.value)}
                    placeholder="输入标题名称..."
                    className="bg-background/50 border-border"
                  />
                </div>
```

- [ ] **Step 2: 在参数区域添加并发数量选择按钮**

在参数区域（约第300-400行范围，找到模型选择或宽高比选择的位置），添加并发选择器：

```typescript
              {/* 并发生成数量 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">并发生成数量</label>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => !isGenerating && tasks.length === 0 && setParallelCount(n)}
                      disabled={isGenerating || tasks.length > 0}
                      className={cn(
                        "w-8 h-8 rounded-md text-sm font-medium transition-all duration-200",
                        parallelCount === n
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground",
                        (isGenerating || tasks.length > 0) && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  并发模式时每个请求生成1张图片，共 {parallelCount} 张
                </p>
              </div>
```

- [ ] **Step 3: 检查 TypeScript 错误**

Run: `npx tsc --noEmit src/pages/ImageGeneration.tsx`

Expected: 无错误

---

### Task 7: 添加并发结果展示区域

**Files:**
- Modify: `src/pages/ImageGeneration.tsx`

- [ ] **Step 1: 在结果展示区域添加 ImageCarousel**

找到现有结果展示区域（约第500-600行范围，generatedImages 的展示部分），在其后或替换部分逻辑添加并发结果展示：

```typescript
          {/* 并发结果轮播区 */}
          {tasks.length > 0 && (
            <motion.div variants={itemVariants} className="xl:col-span-7">
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-accent/20 via-primary/20 to-secondary/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
                <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl p-6">
                  <ImageCarousel
                    tasks={tasks}
                    currentIndex={currentIndex}
                    onIndexChange={setCurrentIndex}
                    onRetry={retryTask}
                    onDownload={handleDownload}
                  />
                </div>
              </div>
            </motion.div>
          )}
```

- [ ] **Step 2: 修改条件渲染逻辑**

确保并发模式和非并发模式的结果展示互斥：
- `parallelCount > 1` 且有 tasks 时显示 ImageCarousel
- `parallelCount === 1` 时显示原有 generatedImages 网格

调整现有结果展示区域的条件：

```typescript
          {/* 原有网格结果展示（仅非并发模式） */}
          {generatedImages.length > 0 && parallelCount === 1 && (
            // ... 原有的 generatedImages 展示逻辑保持不变
          )}
```

- [ ] **Step 3: 检查 TypeScript 错误**

Run: `npx tsc --noEmit src/pages/ImageGeneration.tsx`

Expected: 无错误

- [ ] **Step 4: 提交更改**

```bash
git add src/pages/ImageGeneration.tsx
git commit -m "feat(image): add UI for parallel generation and title input"
```

---

### Task 8: 修改下载逻辑支持标题命名

**Files:**
- Modify: `src/pages/ImageGeneration.tsx` (handleDownload 函数)

- [ ] **Step 1: 修改 handleDownload 函数签名**

修改 handleDownload 函数（约第170-183行）支持标题命名：

```typescript
  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = filename // 使用传入的 filename
      a.click()
      URL.revokeObjectURL(blobUrl)
    } catch {
      window.open(url, '_blank')
    }
  }
```

- [ ] **Step 2: 检查 TypeScript 错误**

Run: `npx tsc --noEmit src/pages/ImageGeneration.tsx`

Expected: 无错误

---

### Task 9: 运行完整构建验证

**Files:**
- All modified files

- [ ] **Step 1: 运行 TypeScript 类型检查**

Run: `npx tsc --noEmit`

Expected: 无错误输出

- [ ] **Step 2: 运行构建**

Run: `npm run build`

Expected: 构建成功，无错误

- [ ] **Step 3: 启动开发服务器测试**

Run: `npm run dev:full`

手动测试：
1. 访问图片生成页面
2. 输入标题名称
3. 选择并发数量（如 3）
4. 输入 prompt 并点击生成
5. 验证轮播组件显示
6. 验证下载功能使用标题命名

Expected: 功能正常工作

- [ ] **Step 4: 最终提交**

```bash
git add -A
git commit -m "feat(image): complete parallel generation with title support"
```

---

## 总结

实现完成后，图片生成页面将具备：
1. 标题名称输入（用于保存文件命名）
2. 并发数量选择器（1-10 按钮）
3. 轮播展示组件（ImageCarousel + ImageTaskCard）
4. 独立任务进度追踪和重试功能

与音乐生成保持一致的 UI 交互模式。