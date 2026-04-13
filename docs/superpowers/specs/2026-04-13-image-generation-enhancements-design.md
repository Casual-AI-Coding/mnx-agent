# 图片生成功能增强设计

> 日期: 2026-04-13
> 状态: 待实现

## 概述

增强图片生成页面的参数配置功能，使其与 MiniMax 官方调试台 (https://solutions.minimaxi.com/debug/image) 保持一致。

## 修改清单

| 功能 | 当前状态 | 目标状态 |
|------|----------|----------|
| 图片数量 | 1-9 按钮，默认从 settings 读取 | 4-9 按钮，默认选中 9 |
| 并发数量 | 1-10 按钮 | 1-5 按钮，默认 1 |
| 宽高比 | 固定显示前 4 个比例按钮 | Popup 弹窗：8 个预设 + 自定义尺寸 |
| 参考图片 | 仅支持文件上传 | 上传 + URL 输入（Tab 切换） |
| 高级设置 | 仅种子输入 | + 自动优化提示词开关 |

## 详细设计

### 1. 图片数量

**位置**: `src/pages/ImageGeneration.tsx` 顶部按钮组

**修改内容**:
- 按钮选项从 `[1,2,3,4,5,6,7,8,9]` 改为 `[4,5,6,7,8,9]`
- 默认值改为 `9`（新初始化时）
- 保持现有按钮样式和交互逻辑

**涉及代码**:
```tsx
// 当前
const numImagesOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9]

// 目标
const numImagesOptions = [4, 5, 6, 7, 8, 9]
```

### 2. 并发数量

**位置**: `src/pages/ImageGeneration.tsx` 顶部按钮组

**修改内容**:
- 按钮选项从 `[1,2,3,4,5,6,7,8,9,10]` 改为 `[1,2,3,4,5]`
- 默认值保持 `1`

**涉及代码**:
```tsx
// 当前
const parallelCountOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

// 目标
const parallelCountOptions = [1, 2, 3, 4, 5]
```

### 3. 宽高比 Popup 弹窗

**位置**: `src/pages/ImageGeneration.tsx` 宽高比选择区域

**当前实现**:
```tsx
{ASPECT_RATIOS.slice(0, 4).map((ratio) => (
  <button key={ratio.value} ...>
    {ratio.label}
  </button>
))}
```

**目标实现**: Popup 弹窗组件

#### 弹窗结构

```
┌─────────────────────────────────────┐
│  选择宽高比                          │
├─────────────────────────────────────┤
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐            │
│  │1:1│ │16:9│ │4:3│ │3:2│            │
│  └───┘ └───┘ └───┘ └───┘            │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐            │
│  │2:3│ │3:4│ │9:16│ │21:9│           │
│  └───┘ └───┘ └───┘ └───┘            │
├─────────────────────────────────────┤
│  ○ 自定义尺寸                        │
│  ┌─────────┐ ┌─────────┐            │
│  │ 宽度 px │ │ 高度 px │            │
│  └─────────┘ └─────────┘            │
├─────────────────────────────────────┤
│              [确认]                  │
└─────────────────────────────────────┘
```

#### 交互逻辑

1. 点击"宽高比"按钮 → 打开弹窗
2. 点击预设比例选项 → 选中并关闭弹窗
3. 点击"自定义尺寸" → 展示宽度/高度输入框
4. 输入自定义尺寸后点击确认 → 关闭弹窗

#### 数据模型

```tsx
interface AspectRatioState {
  type: 'preset' | 'custom'
  preset?: string  // '1:1' | '16:9' | ... | '21:9'
  width?: number   // 自定义宽度 (像素)
  height?: number  // 自定义高度 (像素)
}
```

#### API 调用适配

- 预设比例: 使用 `aspect_ratio` 参数
- 自定义尺寸: 使用 `width` + `height` 参数

```tsx
// 调用示例
if (aspectRatio.type === 'preset') {
  payload.aspect_ratio = aspectRatio.preset
} else {
  payload.width = aspectRatio.width
  payload.height = aspectRatio.height
}
```

### 4. 参考图片

**位置**: `src/pages/ImageGeneration.tsx` 参考图片区域

**当前实现**: 仅文件上传（拖拽/点击）

**目标实现**: Tab 切换组件

#### 结构

```
┌─────────────────────────────┐
│  [上传图片]  [图片URL]        │  ← Tab 切换
├─────────────────────────────┤
│  (上传 Tab)                  │
│  ┌─────────────────────┐    │
│  │   拖拽或点击上传      │    │
│  └─────────────────────┘    │
│                             │
│  (URL Tab)                  │
│  ┌─────────────────────┐    │
│  │ 输入图片URL          │    │
│  └─────────────────────┘    │
└─────────────────────────────┘
```

#### 状态管理

```tsx
type ReferenceImageMode = 'upload' | 'url'

interface ReferenceImageState {
  mode: ReferenceImageMode
  file?: File      // 上传模式时的文件
  url?: string     // URL 模式时的 URL
}
```

#### API 调用适配

- 上传模式: 保持现有逻辑（上传文件 → 获取 URL）
- URL 模式: 直接使用输入的 URL 作为 `reference_image` 参数

### 5. 高级设置

**位置**: `src/pages/ImageGeneration.tsx` 高级设置折叠区域

**当前实现**: 仅包含种子输入

**目标实现**: 增加"自动优化提示词"开关

#### 新增内容

```tsx
<div className="flex items-center justify-between">
  <label>自动优化提示词</label>
  <Toggle 
    checked={promptOptimizer}
    onChange={(v) => setPromptOptimizer(v)}
  />
</div>
```

#### API 参数

新增 `prompt_optimizer` 参数（布尔值）:

```tsx
payload.prompt_optimizer = promptOptimizer
```

## 涉及文件

| 文件 | 修改内容 |
|------|----------|
| `src/pages/ImageGeneration.tsx` | UI 全部修改 |
| `src/components/ui/AspectRatioPopup.tsx` | 新增：宽高比弹窗组件 |
| `src/lib/api/image.ts` | 增加 `width/height/prompt_optimizer` 参数支持 |
| `server/routes/image.ts` | 后端路由增加新参数处理 |
| `server/lib/minimax.ts` | MiniMaxClient 增加新参数传递 |

## 现有代码利用

- `ASPECT_RATIOS` 常量已包含全部 8 个比例，无需新增
- 自定义尺寸的类型定义已存在于 `src/types/image.ts`
- 可复用现有 UI 组件样式（Button, Input, Toggle）

## 验收标准

1. 图片数量按钮显示 [4-9]，默认选中 9
2. 并发数量按钮显示 [1-5]，默认选中 1
3. 宽高比弹窗包含全部 8 个预设 + 自定义尺寸选项
4. 自定义尺寸可输入宽/高像素值
5. 参考图片支持上传和 URL 两种方式切换
6. 高级设置包含"自动优化提示词"开关
7. 所有新参数正确传递到 MiniMax API