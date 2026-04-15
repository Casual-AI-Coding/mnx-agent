# UI Enhancement Design

> 日期: 2026-04-15
> 状态: Approved

## 背景

用户反馈两个 UI 问题需要改进：
1. 媒体管理页面的收藏/开放筛选项太小，点击不够舒适
2. 音乐生成的 batch 轮播页视觉效果不佳：卡片单调、布局不协调、动效僵硬

## 设计目标

- 筛选项略微增大，保持紧凑但更易点击
- 轮播卡片融入高级设计元素，但保持与现有风格一致
- 动效更流畅，过渡动画使用物理模拟

---

## 1. 媒体管理筛选项放大

### 改动文件
`src/pages/MediaManagement.tsx` lines 138-216

### 样式变更

| 属性 | 当前值 | 改进值 |
|------|--------|--------|
| Button高度 | `h-7` (28px) | `h-8` (32px) |
| 水平padding | `px-2.5` (10px) | `px-3` (12px) |
| 文字大小 | `text-xs` (12px) | `text-sm` (14px) |
| Icon大小 | `w-3.5 h-3.5` (14px) | `w-4 h-4` (16px) |
| 容器padding | `p-1` (4px) | `p-1.5` (6px) |

### 影响范围
- 收藏筛选按钮（已收藏、未收藏）
- 开放筛选按钮（私有、公开、他人公开）

### 效果预期
更舒适的点击体验，视觉上更突出但仍保持紧凑。

---

## 2. 音乐轮播卡片视觉升级

### 改动文件
- `src/components/music/MusicTaskCard.tsx` — 卡片样式
- `src/components/music/MusicCarousel.tsx` — 轮播容器、导航、指示器
- `src/pages/MusicGeneration.tsx` — 整体布局协调（可选）

### A. 卡片视觉层次

**现状问题**: `bg-card/80` 单调背景 + 状态边框，缺少视觉层次

**改进方案**:

1. **渐变背景**: 根据状态使用微妙渐变
   - 生成中: `bg-gradient-to-br from-blue-500/5 to-purple-500/5`
   - 完成: `bg-gradient-to-br from-green-500/5 to-emerald-500/5`
   - 失败: `bg-gradient-to-br from-red-500/5 to-orange-500/5`

2. **玻璃态效果**: 
   - 添加 `backdrop-blur-sm`
   - 浅色主题: `bg-white/60`
   - 深色主题: `bg-black/20`

3. **状态指示增强**:
   - 进度条: 渐变色 + 发光效果 (`shadow-{status-color}/50`)
   - 状态徽章: 微妙阴影 + 更醒目的颜色

4. **内容区域分区**:
   - 顶部: 状态信息区（带半透明背景分隔）
   - 中部: 音频播放区（可添加波形装饰或专辑封面占位）
   - 底部: 操作按钮区（带背景区分）

### B. 整体布局改进

**现状问题**: 卡片间距、背景与页面其他元素不协调

**改进方案**:

1. **轮播容器**:
   - 添加圆角边框: `rounded-xl border border-border/50`
   - 内部 padding: `p-4`
   - 背景装饰: 微妙渐变或图案

2. **卡片间距**:
   - 保持紧凑但增加呼吸感
   - 容器内使用 `gap-3` 而非 `space-y-4`

3. **阴影层次**:
   - 卡片添加: `shadow-lg shadow-{status-color}/10`
   - 完成状态: 绿色阴影
   - 生成中: 蓝色阴影 + 动态脉动
   - 失败: 红色阴影

### C. 动效优化

**现状问题**: 过渡动画僵硬，使用固定的 ease 曲线

**改进方案**:

1. **过渡曲线**: 改用 spring 物理动画
   ```typescript
   transition: {
     type: "spring",
     stiffness: 300,
     damping: 30
   }
   ```

2. **入场动画**: 卡片淡入 + 微妙上移
   ```typescript
   initial: { opacity: 0, y: 10 }
   animate: { opacity: 1, y: 0 }
   ```

3. **状态切换**: 子元素独立微动效
   - 进度条宽度变化: spring 动画
   - 徽章出现: scale + opacity 组合

4. **交互反馈**: 按钮状态
   ```typescript
   whileHover: { scale: 1.05 }
   whileTap: { scale: 0.95 }
   ```

---

## 3. 页面 Glassmorphism 升级

### 背景

ImageGeneration 页面已实现高级视觉效果：
- 卡片: `bg-card/80 backdrop-blur-xl border border-border/50`
- Hover glow: `bg-gradient-to-r from-accent/20 via-primary/20 to-secondary/20 blur`
- 阴影: `shadow-lg shadow-primary/25`

其他生成页面（MusicGeneration、VideoGeneration、VideoAgent）视觉效果相对平淡，需要统一升级。

### 改动文件

| 页面 | 文件路径 |
|------|----------|
| MusicGeneration | `src/pages/MusicGeneration.tsx` |
| VideoGeneration | `src/pages/VideoGeneration.tsx` |
| VideoAgent | `src/pages/VideoAgent.tsx` |

### 升级方案

每个页面需要应用 ImageGeneration 的 glassmorphism 模式：

**卡片容器模式**:
```tsx
<div className="relative group">
  {/* Hover glow */}
  <div className="absolute -inset-0.5 bg-gradient-to-r from-accent/20 via-primary/20 to-secondary/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
  {/* Glass card */}
  <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl overflow-hidden">
    {/* Content */}
  </div>
</div>
```

**按钮增强**:
```tsx
className="shadow-lg shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30"
```

**结果面板**:
```tsx
className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-xl"
```

### 各页面适配要点

#### MusicGeneration
- 主卡片（Prompt/参数）应用 glassmorphism
- MusicTaskCard 已有部分效果，需增强阴影和 hover glow
- 结果区域（轮播）添加整体玻璃容器

#### VideoGeneration
- 左侧控制面板应用 glassmorphism
- 右侧结果展示区添加玻璃背景
- 视频预览卡片增强阴影

#### VideoAgent
- Agent 对话面板应用 glassmorphism
- 视频生成状态卡片增强视觉效果
- 响应区域添加玻璃背景

### 效果预期

- 所有生成页面视觉风格统一
- Glassmorphism 效果增添现代感和高级感
- Hover 交互反馈更明显
- 深色主题下效果正常（backdrop-blur 对深色同样有效）

---

## 实现边界

### 必须保持
- 现有功能逻辑不变
- 深色/浅色主题兼容
- 无障碍访问性（ARIA 属性保留）

### 不涉及
- 音频播放逻辑
- API 调用流程
- 状态管理逻辑

---

## 验收标准

1. 筛选项高度从 28px → 32px，文字从 12px → 14px
2. 卡片有渐变背景和玻璃态效果
3. 进度条有发光阴影效果
4. 过渡动画使用 spring 物理模拟
5. 按钮有 hover/tap 缩放反馈
6. 深色主题下效果正常