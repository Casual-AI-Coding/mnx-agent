# 媒体管理增强设计文档

**日期**: 2026-04-09
**状态**: 已批准
**范围**: 媒体管理页面交互增强

## 目标

为媒体管理页面添加三项交互增强：
1. **删除后智能补充** - 删除图片后自动重新查询并补充分页数据
2. **弹性飞入动画** - 新数据补充时带有炫酷的弹性飞入特效
3. **悬浮预览图** - hover图片卡片时显示比卡片更大的预览图

## 用户需求

### 1. 删除后智能补充

**当前问题**: 删除图片后仅从本地状态移除，不重新查询，可能导致当前页变空。

**解决方案**: 
- 删除后检测当前页是否为空
- 若当前页变空且不是第一页 → 重新fetch当前页（获取补充数据）
- 保持当前页号，不跳页，用户体验更流畅

### 2. 弹性飞入动画

**需求**: 新增数据补充到页面时的飞入动画
- **风格**: 弹性飞入（spring bounce效果）
- **方向**: 随机方向（从下方各个角度飞入）
- **节奏**: 瀑布流效果（卡片依次延迟飞入）

### 3. 悬浮预览图

**需求**: hover悬浮图片卡片时展示比卡片更大的预览图
- **形式**: 浮动卡片跟随鼠标位置
- **尺寸**: 固定宽度280px，高度自适应
- **定位**: 自动边界检测，避免超出屏幕

---

## 架构设计

### 模块结构

```
src/
├── components/media/
│   ├── MediaCard.tsx              # 改造：添加motion包装 + hover preview trigger
│   ├── MediaCardPreview.tsx       # 新增：悬浮预览组件（Portal渲染）
│   └── AnimatedMediaGrid.tsx      # 新增：带动画的网格容器
│
├── hooks/
│   └── useMediaManagement.ts      # 改造：删除后智能补充逻辑
│
└── lib/
    └── animations/
        ├── media-variants.ts      # 新增：MediaCard动画variants
        └── spring-configs.ts      # 新增：弹性动画配置
```

### 依赖

**已安装**:
- `framer-motion@^11.0.8` ✅

**无需新增依赖**:
- Portal使用React内置`createPortal()`
- 弹性动画使用Framer Motion内置spring
- 边界检测使用自定义逻辑（无需floating-ui）

---

## 详细设计

### 1. 智能补充逻辑

**文件**: `src/hooks/useMediaManagement.ts`

**改造点**: `handleDelete` 和 `handleBatchDelete`

```typescript
// handleDelete改造
const handleDelete = async () => {
  if (!deleteDialog.record) return

  try {
    await deleteMediaApi(deleteDialog.record.id)
    
    // 1. 先从本地状态移除
    const remainingRecords = records.filter(r => r.id !== deleteDialog.record.id)
    setRecords(remainingRecords)
    
    // 2. 检测当前页是否为空
    if (remainingRecords.length === 0 && pagination.page > 1) {
      // 当前页变空且不是第一页 → 重新fetch当前页
      await fetchMedia(false)
    } else if (remainingRecords.length === 0 && pagination.page === 1) {
      // 第一页变空 → 更新为空状态
      setPagination(prev => ({ ...prev, total: 0, totalPages: 0 }))
    }
    
    setDeleteDialog({ isOpen: false, record: null })
    toastSuccess('删除成功')
  } catch (err) {
    setError(err instanceof Error ? err.message : '删除失败')
  }
}
```

**批量删除**: 同样逻辑，检测 `records.length - deleteCount === 0`

---

### 2. 弹性飞入动画

#### 2.1 动画配置

**文件**: `src/lib/animations/media-variants.ts`

```typescript
import type { Variants } from 'framer-motion'

// 随机方向生成器
export function getRandomFlyInDirection() {
  const angle = Math.random() * Math.PI * 0.5 // 0-90度（下方范围）
  const distance = 50 + Math.random() * 30   // 50-80px
  const sign = Math.random() > 0.5 ? 1 : -1
  
  return {
    startX: Math.sin(angle) * distance * sign,
    startY: Math.cos(angle) * distance,
  }
}

// 网格容器variants（stagger效果）
export const gridContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: 0.1,
      staggerChildren: 0.06,
      when: 'beforeChildren',
    },
  },
}

// 单个卡片variants（弹性飞入）
export const cardVariants: Variants = {
  hidden: (custom: { startX: number; startY: number }) => ({
    opacity: 0,
    x: custom.startX,
    y: custom.startY,
    scale: 0.85,
    rotate: custom.startX > 0 ? 5 : -5,
  }),
  visible: {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    rotate: 0,
    transition: {
      type: 'spring',
      stiffness: 120,   // 弹性强度
      damping: 14,      // 阻尼（越大越快停止）
      mass: 0.8,        // 质量（影响惯性）
    },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: -20,
    transition: { duration: 0.2 },
  },
}
```

#### 2.2 AnimatedMediaGrid组件

**文件**: `src/components/media/AnimatedMediaGrid.tsx`

```tsx
import { motion, AnimatePresence } from 'framer-motion'
import { MediaCard } from './MediaCard'
import { gridContainerVariants, cardVariants, getRandomFlyInDirection } from '@/lib/animations/media-variants'
import type { MediaRecord } from '@/types/media'

interface AnimatedMediaGridProps {
  records: MediaRecord[]
  signedUrls: Record<string, string>
  selectedIds: Set<string>
  onSelect: (id: string) => void
  onPreview: (record: MediaRecord) => void
  onDownload: (record: MediaRecord) => void
  onDelete: (record: MediaRecord) => void
}

export function AnimatedMediaGrid({
  records,
  signedUrls,
  selectedIds,
  onSelect,
  onPreview,
  onDownload,
  onDelete,
}: AnimatedMediaGridProps) {
  return (
    <motion.div
      variants={gridContainerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
    >
      <AnimatePresence mode="popLayout">
        {records.map((record) => (
          <motion.div
            key={record.id}
            custom={getRandomFlyInDirection()}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            layout
          >
            <MediaCard
              record={record}
              signedUrl={signedUrls[record.id]}
              isSelected={selectedIds.has(record.id)}
              onSelect={() => onSelect(record.id)}
              onPreview={() => onPreview(record)}
              onDownload={() => onDownload(record)}
              onDelete={() => onDelete(record)}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  )
}
```

---

### 3. 悬浮预览图

#### 3.1 MediaCardPreview组件

**文件**: `src/components/media/MediaCardPreview.tsx`

```tsx
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import type { MediaRecord } from '@/types/media'

interface MediaCardPreviewProps {
  record: MediaRecord
  signedUrl: string
  mousePosition: { x: number; y: number }
  visible: boolean
}

export function MediaCardPreview({ record, signedUrl, mousePosition, visible }: MediaCardPreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  
  // 边界检测
  useEffect(() => {
    if (!visible || !previewRef.current) return
    
    const preview = previewRef.current
    const rect = preview.getBoundingClientRect()
    const padding = 16
    const offset = 30
    
    let x = mousePosition.x + offset
    let y = mousePosition.y - rect.height / 2
    
    // 右边界检测
    if (x + rect.width > window.innerWidth - padding) {
      x = mousePosition.x - rect.width - offset
    }
    
    // 上边界检测
    if (y < padding) {
      y = padding
    }
    
    // 下边界检测
    if (y + rect.height > window.innerHeight - padding) {
      y = window.innerHeight - rect.height - padding
    }
    
    setPosition({ x, y })
  }, [visible, mousePosition])
  
  if (record.type !== 'image' || !signedUrl) return null
  
  return createPortal(
    <AnimatePresence>
      {visible && (
        <motion.div
          ref={previewRef}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.15 }}
          style={{
            position: 'fixed',
            left: position.x,
            top: position.y,
            width: 280,
            zIndex: 9999,
            pointerEvents: 'none',
          }}
          className="rounded-lg overflow-hidden shadow-2xl border border-border bg-card"
        >
          <img
            src={signedUrl}
            alt={record.original_name || record.filename}
            className="w-full h-auto max-h-80 object-contain"
          />
          <div className="p-2 bg-card/95">
            <p className="text-xs text-muted-foreground truncate">
              {record.original_name || record.filename}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
```

#### 3.2 MediaCard改造

**文件**: `src/components/media/MediaCard.tsx`

**添加**:
- `onMouseMove` 跟踪鼠标位置
- `onMouseEnter/onMouseLeave` 控制预览显示
- 渲染 `MediaCardPreview` 组件

```tsx
// 添加state
const [showPreview, setShowPreview] = useState(false)
const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

// 添加事件处理
const handleMouseMove = (e: React.MouseEvent) => {
  setMousePosition({ x: e.clientX, y: e.clientY })
}

// 在卡片容器上添加
<div
  onMouseEnter={() => setShowPreview(true)}
  onMouseMove={handleMouseMove}
  onMouseLeave={() => setShowPreview(false)}
>

// 在组件末尾渲染预览
{record.type === 'image' && signedUrl && (
  <MediaCardPreview
    record={record}
    signedUrl={signedUrl}
    mousePosition={mousePosition}
    visible={showPreview}
  />
)}
```

---

## 数据流

```
用户删除卡片
    ↓
useMediaManagement.handleDelete()
    ↓
从本地状态移除卡片
    ↓
检测: 当前页是否为空?
    ├─ 是 && page > 1 → fetchMedia(false) 重新获取当前页
    ├─ 是 && page === 1 → 更新为空状态
    └─ 否 → 无需补充
    ↓
setRecords(新数据)
    ↓
AnimatedMediaGrid检测到新数据
    ↓
AnimatePresence执行动画
    ├─ 旧卡片: exit动画（fade out）
    └─ 新卡片: fly-in动画（spring bounce + 随机方向）
```

---

## 测试计划

### 功能测试

| 测试项 | 预期结果 | 验证方法 |
|--------|---------|---------|
| 单个删除（当前页有剩余） | 仅移除卡片，无补充 | 删除第2页最后一张 → 停留第2页 |
| 单个删除（当前页变空） | 自动补充新数据 | 删除第2页全部 → 自动补充新数据 + 飞入动画 |
| 批量删除（当前页变空） | 自动补充新数据 | 批量删除第3页全部 → 自动补充 |
| 飞入动画 | 弹性效果 + 随机方向 | 视觉验证 |
| 悬浮预览 | 跟随鼠标 + 边界检测 | hover卡片 → 查看预览图位置 |

### 性能测试

| 测试项 | 基准 | 验证方法 |
|--------|------|---------|
| 飞入动画流畅度 | 60fps | Chrome DevTools Performance |
| 悬浮预览延迟 | <100ms | 从hover到预览显示的时间 |
| 批量删除（20张） | <2s | 删除执行时间 |

---

## 实现步骤

1. **创建动画配置** - `src/lib/animations/media-variants.ts`
2. **创建AnimatedMediaGrid** - `src/components/media/AnimatedMediaGrid.tsx`
3. **创建MediaCardPreview** - `src/components/media/MediaCardPreview.tsx`
4. **改造MediaCard** - 添加hover预览逻辑
5. **改造useMediaManagement** - 添加智能补充逻辑
6. **改造MediaManagement页面** - 使用AnimatedMediaGrid替换原网格
7. **测试验证** - 功能测试 + 性能测试

---

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 飞入动画性能问题 | 卡顿 | 使用GPU加速属性（transform, opacity） |
| 预览图加载慢 | 用户体验差 | 使用已加载的signedUrl |
| 边界检测不准确 | 预览图超出屏幕 | 添加安全边距（16px） |
| 批量删除时动画过多 | 视觉混乱 | 使用stagger控制动画节奏 |

---

## 参考

- Framer Motion Spring文档: https://www.framer.com/motion/
- 项目现有动画模式: `src/pages/WorkflowMarketplace/TemplateGrid.tsx`
- Portal实现: React官方文档