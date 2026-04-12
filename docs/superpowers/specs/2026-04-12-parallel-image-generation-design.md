# 并行图片生成功能设计文档

> 创建时间: 2026-04-12

## 背景

当前图片生成页面 (`ImageGeneration.tsx`) 仅支持单次生成，用户无法批量生成多个版本进行对比选择。音乐生成已实现并行生成功能，需要在图片生成中实现类似功能。

## 目标

允许用户指定并行数量 (1-10)，同时生成多份图片，提供独立的进度追踪和轮播结果展示。同时添加标题名称支持，用于保存图片时的文件命名。

## 核心概念

### 1. 标题名称 (Image Title)

用户输入可选标题，用于保存图片时的文件命名：
- 默认空值（使用时间戳或序号命名）
- 非空时作为文件名前缀
- 仅用于前端文件命名，不传递给后端 API

### 2. 并行数量 (Parallel Count)

用户通过按钮选择生成份数：
- 范围: 1-10
- 默认: 1
- UI: 按钮组控件（与音乐生成一致）

### 3. 任务卡片 (Task Card)

每个生成任务对应一张卡片，包含：
- 状态徽章: idle | generating | completed | failed
- 进度条: 0-100%
- 图片预览: 完成后显示
- 错误信息: 失败时显示
- 下载/重试按钮

### 4. 轮播展示 (Carousel)

结果以轮播形式展示：
- 水平布局，左右箭头切换
- 底部概览条显示整体进度（点状指示）
- 支持键盘左右箭头导航

## 状态模型

```typescript
interface ImageTask {
  id: string              // UUID
  status: 'idle' | 'generating' | 'completed' | 'failed'
  progress: number        // 0-100
  imageUrl?: string       // 图片 URL
  error?: string
  retryCount: number
}

interface ImageGenerationState {
  tasks: ImageTask[]
  currentIndex: number    // 蛇播索引
  isGenerating: boolean
  parallelCount: number   // 1-10
  imageTitle: string      // 标题名称
}
```

## 参考实现

参考音乐生成的实现：
- `MusicGeneration.tsx` 第621-640行: 并发数量选择器 UI
- `MusicGeneration.tsx` 第206-279行: `handleGenerate` 并发执行逻辑
- `MusicCarousel.tsx`: 轮播容器组件
- `MusicTaskCard.tsx`: 单个任务卡片组件
- `saveMusicToMedia()` 函数: 标题命名逻辑

## 并发架构

**方案选择: 纯前端并发**

使用 `Promise.allSettled` 管理 N 个 `generateImage()` API 调用：
- 无后端改动
- 每个请求独立追踪状态
- 失败不影响其他任务

## 文件命名逻辑

保存图片时使用标题命名（参考音乐生成 `saveMusicToMedia`）：

```typescript
const saveImageToMedia = async (imageUrl: string, title?: string, index?: number) => {
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
  // ... 下载并保存
}
```

## UI 布局

```
┌─────────────────────────────────────────────────────┐
│  标题输入 + 参数区域 + 并发数量按钮                    │
├─────────────────────────────────────────────────────┤
│  结果轮播区: Task Card                               │
│  ◀  [进度条 | 图片预览 | 状态]  ▶                    │
├─────────────────────────────────────────────────────┤
│  底部概览条: [1/3] ●●○                               │
├─────────────────────────────────────────────────────┤
│  生成按钮                                            │
└─────────────────────────────────────────────────────┘
```

## 新增组件

```
src/components/image/
  ├── ImageCarousel.tsx    # 轮播容器（新增）
  ├── ImageTaskCard.tsx    # 单个任务卡片（新增）
  └── ...existing files
```

### ImageCarousel.tsx

参考 `MusicCarousel.tsx`：
- 接收 `tasks: ImageTask[]` 和 `currentIndex`
- 左右箭头切换
- 底部指示点
- 完成计数显示

### ImageTaskCard.tsx

参考 `MusicTaskCard.tsx`：
- 状态徽章 + 进度条
- 图片预览区域
- 下载按钮
- 重试按钮

## 交互细节

1. 标题输入: 文本框，可选填
2. 并行数量按钮: 点击切换，实时显示数值
3. 生成按钮: generating 时禁用，显示进度文字
4. 轮播导航: 左右箭头 + 点击概览条圆点
5. 键盘支持: 左右箭头键切换（focus 结果区时）
6. 自动切换: 任务完成时可选跳转到该卡片

## 边界情况

- 生成中禁用参数调整（防止中途修改）
- 图片下载使用标题命名
- 最大重试次数提示（3 次后）
- 与现有 `n` 参数的区别：并发是 N 个独立请求，`n` 是单请求返回 N 张图

## 实现要点

### ImageGeneration.tsx 改动

1. 新增状态:
   ```typescript
   const [imageTitle, setImageTitle] = useState('')
   const [tasks, setTasks] = useState<ImageTask[]>([])
   const [parallelCount, setParallelCount] = useState(1)
   const [currentIndex, setCurrentIndex] = useState(0)
   ```

2. 新增 `updateTask` 函数（参考音乐生成）

3. 改造 `handleGenerate` 为并发执行

4. 新增 UI 区块:
   - 标题输入框
   - 并发数量按钮组
   - 蛇播结果展示区

### 文件修改清单

| 文件 | 改动 |
|------|------|
| `src/pages/ImageGeneration.tsx` | 添加标题、并发状态和逻辑 |
| `src/components/image/ImageCarousel.tsx` | 新建轮播组件 |
| `src/components/image/ImageTaskCard.tsx` | 新建任务卡片组件 |

## 与 `n` 参数的区别

| 方式 | 说明 |
|------|------|
| API `n` 参数 | 单次请求返回 N 张图片，共享同一 prompt |
| 前端并发 | N 个独立请求，每个请求独立追踪状态 |

**并发请求的 `n` 设置**: 使用并发模式时，每个独立请求固定 `n=1`（单张图片），避免与并发概念混淆。用户仍可在非并发模式下使用 `n` 参数批量生成。

两种模式互斥：
- 并发模式激活时 (`parallelCount > 1`) → 每请求 `n=1`
- 并发模式未激活 (`parallelCount = 1`) → 保持现有 `n` 参数逻辑