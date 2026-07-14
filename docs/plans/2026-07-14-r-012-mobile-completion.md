# R-012 移动端适配 — 实现计划

> **日期**: 2026-07-14
> **设计依据**: `docs/specs/2026-05-11-security-ux-mobile-fixes-design.md` §5
> **目标版本**: v3.0
> **范围**: Tailwind 响应式优化 + 移动端布局组件

---

## 前置条件确认

| 条件 | 状态 |
|------|------|
| AppLayout 移动端抽屉化 | ✅ 已完成 |
| Sidebar `isMobile` prop | ✅ 已完成 |
| Header 汉堡菜单 `lg:hidden` | ✅ 已完成 |
| `useMobile` / `useTablet` / `useDesktop` hooks | ✅ 已就绪，未被消费 |
| `useMediaQuery` hook | ✅ 已就绪 |
| 主内容区 `p-4 lg:p-6` | ✅ 已完成（部分） |

---

## Wave 1 — 共享工具（基础）

### A1: `useReducedMotion` Hook + 断点常量

**Files**:
- Create: `src/hooks/useReducedMotion.ts`
- Create: `src/hooks/useReducedMotion.test.ts`
- Create: `src/lib/breakpoints.ts`
- Modify: `src/hooks/index.ts` (如有)

**RED**:
```tsx
// src/hooks/useReducedMotion.test.ts
import { renderHook, act } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useReducedMotion } from './useReducedMotion'

describe('useReducedMotion', () => {
  let listeners: Array<(e: MediaQueryListEvent) => void>

  beforeEach(() => {
    listeners = []
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        addEventListener: (_event: string, listener: (e: MediaQueryListEvent) => void) => {
          listeners.push(listener)
        },
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  it('returns true when prefers-reduced-motion is reduce', () => {
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(true)
  })

  it('responds to media query changes', () => {
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(true)
    act(() => {
      listeners.forEach(fn => fn({ matches: false } as MediaQueryListEvent))
    })
    expect(result.current).toBe(false)
  })
})
```

**GREEN**:
```typescript
// src/hooks/useReducedMotion.ts
import { useMediaQuery } from './useMediaQuery'

/**
 * 检测用户是否启用了 prefers-reduced-motion 设置。
 * 用于移动端抽屉动画、页面切换动画中降级。
 */
export function useReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}
```

```typescript
// src/lib/breakpoints.ts
/** Tailwind 断点常量 */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const

export type BreakpointKey = keyof typeof BREAKPOINTS

/** 移动端阈值 — 低于此宽度视为移动端 */
export const MOBILE_THRESHOLD = BREAKPOINTS.lg // 1024px
```

**提交**:
```bash
git add src/hooks/useReducedMotion.ts src/hooks/useReducedMotion.test.ts src/lib/breakpoints.ts
git commit -m "feat(mobile): add useReducedMotion hook and breakpoints constant

- Add useReducedMotion() wrapping useMediaQuery('(prefers-reduced-motion: reduce)')
- Add BREAKPOINTS / MOBILE_THRESHOLD to lib/breakpoints.ts
- Tests: reduce=true → returns true; media change → updates state"
```

---

### A2: `useBreakpoint` Hook

**Files**:
- Create: `src/hooks/useBreakpoint.ts`
- Create: `src/hooks/useBreakpoint.test.ts`

**RED**:
```tsx
// src/hooks/useBreakpoint.test.ts
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useBreakpoint } from './useBreakpoint'

describe('useBreakpoint', () => {
  let currentWidth = 1440

  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => {
        const minMatch = query.match(/min-width:\s*(\d+)px/)
        const maxMatch = query.match(/max-width:\s*(\d+)px/)
        let matches = true
        if (minMatch) matches = currentWidth >= parseInt(minMatch[1], 10)
        if (maxMatch) matches = matches && currentWidth <= parseInt(maxMatch[1], 10)
        return {
          matches,
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          addListener: vi.fn(),
          removeListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }
      }),
    })
  })

  it('returns "sm" at 375px', () => {
    currentWidth = 375
    const { result } = renderHook(() => useBreakpoint())
    expect(result.current).toBe('sm')
  })

  it('returns "md" at 768px', () => {
    currentWidth = 768
    const { result } = renderHook(() => useBreakpoint())
    expect(result.current).toBe('md')
  })

  it('returns "lg" at 1024px', () => {
    currentWidth = 1024
    const { result } = renderHook(() => useBreakpoint())
    expect(result.current).toBe('lg')
  })

  it('returns "xl" at 1440px', () => {
    currentWidth = 1440
    const { result } = renderHook(() => useBreakpoint())
    expect(result.current).toBe('xl')
  })
})
```

**GREEN**:
```typescript
// src/hooks/useBreakpoint.ts
import { BREAKPOINTS, MOBILE_THRESHOLD } from '@/lib/breakpoints'
import { useMediaQuery } from './useMediaQuery'

export type Breakpoint = 'sm' | 'md' | 'lg' | 'xl'

export function useBreakpoint(): Breakpoint {
  const isXl = useMediaQuery(`(min-width: ${BREAKPOINTS.xl}px)`)
  const isLg = useMediaQuery(`(min-width: ${BREAKPOINTS.lg}px)`)
  const isMd = useMediaQuery(`(min-width: ${BREAKPOINTS.md}px)`)

  if (isXl) return 'xl'
  if (isLg) return 'lg'
  if (isMd) return 'md'
  return 'sm'
}

export function useIsMobile(): boolean {
  return !useMediaQuery(`(min-width: ${MOBILE_THRESHOLD}px)`)
}
```

**提交**:
```bash
git add src/hooks/useBreakpoint.ts src/hooks/useBreakpoint.test.ts
git commit -m "feat(mobile): add useBreakpoint and useIsMobile hooks

- useBreakpoint() returns 'sm'|'md'|'lg'|'xl' based on window width
- useIsMobile() returns true when width < 1024px (MOBILE_THRESHOLD)
- Tests cover 375/768/1024/1440px"
```

---

### A3: Button 移动端触控变体

**Files**:
- Modify: `src/components/ui/Button.tsx`
- Modify: `src/components/ui/Button.test.tsx`

**GREEN** (在已检查 Button.tsx cva 结构后):
```tsx
// 给 buttonVariants 添加 touchable 变体
touchable: {
  false: '',
  true: 'min-h-[44px] min-w-[44px]',
}

// ButtonProps 扩展
interface ButtonProps extends ... {
  touchable?: boolean
}
```

**测试追加**:
```tsx
it('applies mobile touch-friendly styles with touchable variant', () => {
  render(<Button touchable>点击</Button>)
  const btn = screen.getByRole('button', { name: '点击' })
  expect(btn.className).toContain('min-h-[44px]')
  expect(btn.className).toContain('min-w-[44px]')
})
```

**提交**:
```bash
git add src/components/ui/Button.tsx src/components/ui/Button.test.tsx
git commit -m "feat(mobile): add Button touchable variant for 44px min hit target"
```

---

### A4: Toast 移动端数量限制

**Files**:
- Modify: `src/App.tsx`

**实现**: 在 Toaster 组件加 `visibleToasts={3}` 限制，避免遮挡底部输入。

**提交**:
```bash
git add src/App.tsx
git commit -m "feat(mobile): constrain toast visibleToasts to 3 to avoid mobile bottom input occlusion"
```

---

## Wave 2 — 应用层页面响应式（6 个任务并行）

### B1: Dashboard 响应式打磨

**Files**: `src/pages/Dashboard.tsx`

调整：
- 标题 `text-3xl` → `text-2xl sm:text-3xl`
- 快速操作 `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5` → `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`
- 外层 `space-y-8` → `space-y-6`

### B2: MediaManagement 工具栏适配

**Files**: `src/pages/MediaManagement/MediaUploader.tsx`

工具栏 flex-wrap，搜索栏响应式宽度。

### B3: 表格页面横向滚动容器

**Files**:
- `src/pages/CronManagement/*.tsx`
- `src/pages/DeadLetterQueue/DLQTable.tsx`
- `src/pages/UserManagement.tsx`

策略：表格外层加 `overflow-x-auto -mx-4 px-4`。

### B4: 画廊/统计页响应式

**Files**: `src/pages/ImageGallery.tsx`、`TokenMonitor.tsx`、`StatsDashboard.tsx`

确保 grid `grid-cols-1` 起始 + 容器 `overflow-hidden`。

### B5: 生成类页面表单 inputMode

**Files**: 8 个生成页面 + 表单组件

数值 input `inputMode="decimal"`，文本 `inputMode="text"`，生成按钮加 `touchable`。

### B6: Admin 子页响应式

**Files**: 8 个 Admin/管理页面

表格 + overflow-x-auto。

---

## Wave 3 — WorkflowBuilder 移动端只读/预览

### C1: 移动端检测 + 条件渲染

**Files**: `src/pages/WorkflowBuilder.tsx`

```tsx
const isMobile = useIsMobile()
if (isMobile) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8">
      <Workflow className="w-16 h-16 text-muted-foreground mb-4" />
      <h2>{t('workflow.desktopOnly')}</h2>
      <p>{t('workflow.desktopOnlyDesc')}</p>
      <Link to="/cron">{t('workflow.viewCronJobs')}</Link>
    </div>
  )
}
```

---

## Wave 4 — 加固 + 综合测试

### D1: prefers-reduced-motion 全局集成

**Files**: `src/components/layout/AppLayout.tsx`

抽屉和遮罩在 reducedMotion=true 时禁用动画。

### D2: 4 断点回归测试

**Files**: `src/components/layout/AppLayout.breakpoints.test.tsx`

### D3: 手动 QA 7 个场景

| 断点 | 页面 | 预期 |
|------|------|------|
| 375px | Dashboard | 2 列网格 + 无横向滚动 |
| 375px | /media | 网格 1 列 + 工具栏 wrap |
| 375px | /cron | 表格横向滚动 |
| 375px | /workflow-builder | 桌面端提示 |
| 768px | /text | 键盘正确 + 按钮 44px |
| 1024px | /media | sidebar 固定 |
| 1440px | Dashboard | 完整桌面布局 |

### D4: 文档更新

- `docs/roadmap/requirement-pools.md`: R-012 → 已完成
- `docs/roadmap/v3-roadmap.md`: R-012 → 已完成
- `CHANGELOG.md`: 新增 v3.0.0 mobile adaptation 条目

---

## 验证清单

| 验证项 | 命令 | 预期 |
|--------|------|------|
| 前端测试 | `npm run test:coverage:frontend` | 全绿 + 覆盖率 ≥ 70% |
| 构建 | `npm run build` | 退出码 0 |
| Lint | `npm run lint` | 退出码 0 |
| 全量测试 | `npm run test -- --run` | 全绿 |
| 手动 QA 375px | Chrome DevTools iPhone SE | 见 §D3 |
| 手动 QA 1440px | 桌面浏览器 | sidebar 固定 |

---

## 禁止事项

- ❌ 禁止 `as any` / `@ts-ignore`
- ❌ 禁止删除现有测试以通过覆盖率
- ❌ 禁止引入新 npm 依赖
- ❌ 禁止修改 Tailwind 断点配置

---

## 预估工作量

| Wave | 任务数 | 预估时间 |
|------|--------|----------|
| Wave 1 (基础) | 4 | 2-3h |
| Wave 2 (应用层) | 6 | 4-6h (并行) |
| Wave 3 (WorkflowBuilder) | 1 | 1h |
| Wave 4 (加固+测试+文档) | 4 | 2h |
| **总计** | **15** | **~10h** |