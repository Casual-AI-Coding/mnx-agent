# 并行音乐生成功能设计文档

> 创建时间: 2026-04-11

## 背景

当前音乐生成页面 (`MusicGeneration.tsx`) 仅支持单次生成，用户无法批量生成多个版本进行对比选择。

## 目标

允许用户指定并行数量 (1-10)，同时生成多份音乐，提供独立的进度追踪和结果展示。

## 核心概念

### 1. 并行数量 (Parallel Count)

用户通过滑块选择生成份数：
- 范围: 1-10
- 默认: 1
- UI: 滑块控件，显示当前数值

### 2. 任务卡片 (Task Card)

每个生成任务对应一张卡片，包含：
- 状态徽章: idle | generating | completed | failed
- 进度条: 0-100%
- 音频播放器: 完成后显示
- 错误信息: 失败时显示
- 重试按钮: 失败时可点击

### 3. 轮播展示 (Carousel)

结果以轮播形式展示：
- 水平布局，左右箭头切换
- 底部概览条显示整体进度（点状指示）
- 支持键盘左右箭头导航

## 状态模型

```typescript
interface MusicTask {
  id: string              // UUID
  status: 'idle' | 'generating' | 'completed' | 'failed'
  progress: number        // 0-100
  audioUrl?: string       // blob object URL
  audioDuration?: number
  error?: string
  retryCount: number
}

interface ParallelMusicState {
  tasks: MusicTask[]
  currentIndex: number    // 轮播索引
  isGenerating: boolean
  parallelCount: number   // 1-10
}
```

## 并发架构

**方案选择: 纯前端并发**

使用 `Promise.allSettled` 管理 N 个 `generateMusic()` API 调用：
- 无后端改动
- 每个请求独立追踪状态
- 失败不影响其他任务

## 错误处理

- 单任务失败: 显示错误 + 重试按钮
- 重试逻辑: 仅重试失败的单个任务
- 重试次数提示: 3 次后显示建议信息

## 日志增强

后端 `MiniMaxClient.musicGeneration()` 调用前打印入参日志：
```
[MiniMax] Music Generation Request: { body: {...}, timestamp: "..." }
```

## UI 布局

```
┌─────────────────────────────────────────────────────┐
│  参数区域 + 并行数量滑块                              │
├─────────────────────────────────────────────────────┤
│  结果轮播区: Task Card                               │
│  ◀  [进度条 | 音频播放器 | 状态]  ▶                  │
├─────────────────────────────────────────────────────┤
│  底部概览条: [1/3] ●●○                               │
├─────────────────────────────────────────────────────┤
│  生成按钮                                            │
└─────────────────────────────────────────────────────┘
```

## 交互细节

1. 并行数量滑块: 拖动调整，实时显示数值
2. 生成按钮: generating 时禁用，显示进度文字
3. 轮播导航: 左右箭头 + 点击概览条圆点
4. 键盘支持: 左右箭头键切换（focus 结果区时）
5. 自动切换: 任务完成时可选跳转到该卡片

## 边界情况

- 生成中禁用参数调整（防止中途修改）
- blob URL 在组件卸载时 revoke
- 音频切换时暂停当前播放
- 最大重试次数提示（3 次后）