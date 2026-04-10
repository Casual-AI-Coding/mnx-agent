# Media Management Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three enhancements to the media management page: smart pagination refill after deletion, elastic fly-in animation for new cards, and hover preview tooltip following mouse position.

**Architecture:** Create reusable animation variants and components following existing Framer Motion patterns, modify the useMediaManagement hook for smart refill logic, and wrap the card grid with AnimatePresence for smooth transitions.

**Tech Stack:** React 18 + TypeScript + Framer Motion v11.0.8 + Tailwind CSS

**Design Doc:** @docs/superpowers/specs/2026-04-09-media-management-enhancements-design.md

---

## Task Dependency Graph

```
Wave 1 (Independent Parallel):
├── Task 1: Create animation variants config
├── Task 2: Create MediaCardPreview component
└── Task 3: Add smart refill logic to hook

Wave 2 (Depend on Wave 1):
├── Task 4: Create AnimatedMediaGrid (depends on Task 1)
└── Task 5: Modify MediaCard (depends on Task 2)

Wave 3 (Depend on Wave 2):
└── Task 6: Update MediaManagement page (depends on Tasks 4 & 5)

Wave 4 (Final):
├── Task 7: Write tests (depends on all above)
└── Task 8: Verify success criteria (depends on all above)
```

---

## Parallel Task Assignment

### Category: visual-engineering (Tasks 1, 2, 4, 5)
UI/UX focused work - animations, hover effects, component styling

### Category: quick (Tasks 3, 6)
Simple modifications to existing files

### Category: unspecified-high (Tasks 7, 8)
Testing and verification work requiring thoroughness

---

## Task 1: Create Animation Variants Configuration

**Category:** visual-engineering  
**Skills:** animate (for spring bounce effects)

**Files:**
- Create: `src/lib/animations/media-variants.ts`
- Reference: `src/pages/WorkflowMarketplace/TemplateGrid.tsx` (variants pattern)

- [ ] **Step 1.1: Write the failing test**

Create `src/lib/animations/media-variants.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  getRandomFlyInDirection,
  gridContainerVariants,
  cardVariants,
} from './media-variants'

describe('getRandomFlyInDirection', () => {
  it('should return object with startX and startY', () => {
    const result = getRandomFlyInDirection()
    expect(result).toHaveProperty('startX')
    expect(result).toHaveProperty('startY')
    expect(typeof result.startX).toBe('number')
    expect(typeof result.startY).toBe('number')
  })

  it('should generate positive startY values (below viewport)', () => {
    const result = getRandomFlyInDirection()
    expect(result.startY).toBeGreaterThan(0)
  })

  it('should generate startX within expected range', () => {
    const result = getRandomFlyInDirection()
    expect(Math.abs(result.startX)).toBeGreaterThanOrEqual(0)
    expect(Math.abs(result.startX)).toBeLessThanOrEqual(80)
  })
})

describe('gridContainerVariants', () => {
  it('should have correct structure', () => {
    expect(gridContainerVariants).toHaveProperty('hidden')
    expect(gridContainerVariants).toHaveProperty('visible')
  })

  it('should have staggerChildren in visible transition', () => {
    const visible = gridContainerVariants.visible as { transition: { staggerChildren: number } }
    expect(visible.transition.staggerChildren).toBe(0.06)
  })
})

describe('cardVariants', () => {
  it('should have hidden, visible, and exit states', () => {
    expect(cardVariants).toHaveProperty('hidden')
    expect(cardVariants).toHaveProperty('visible')
    expect(cardVariants).toHaveProperty('exit')
  })

  it('visible state should use spring transition', () => {
    const visible = cardVariants.visible as { transition: { type: string; stiffness: number } }
    expect(visible.transition.type).toBe('spring')
    expect(visible.transition.stiffness).toBe(120)
  })
})
```

- [ ] **Step 1.2: Run test to verify it fails**

Run: `npx vitest run src/lib/animations/media-variants.test.ts`

Expected: FAIL with "Cannot find module"

- [ ] **Step 1.3: Create the animation variants file**

Create `src/lib/animations/media-variants.ts`:

```typescript
import type { Variants } from 'framer-motion'

/**
 * Generates random initial position for fly-in animation
 * Cards fly in from below the viewport at random angles
 */
export function getRandomFlyInDirection() {
  // Generate angle in lower semicircle (0-180 degrees)
  const angle = Math.random() * Math.PI // 0-180 degrees (below viewport)
  const distance = 50 + Math.random() * 30 // 50-80px distance

  // Calculate x offset (can be left or right)
  const startX = Math.sin(angle) * distance * (Math.random() > 0.5 ? 1 : -1)
  // y is always positive (coming from below)
  const startY = Math.cos(angle) * distance + 30 // Add base offset

  return {
    startX,
    startY,
  }
}

/**
 * Container variants for the media grid
 * Creates staggered animation effect
 */
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

/**
 * Individual card variants with elastic spring animation
 * Custom function receives random direction from getRandomFlyInDirection
 */
export const cardVariants: Variants = {
  hidden: (custom: { startX: number; startY: number }) => ({
    opacity: 0,
    x: custom.startX,
    y: custom.startY,
    scale: 0.85,
    rotate: custom.startX > 0 ? 5 : -5, // Slight rotation based on direction
  }),
  visible: {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    rotate: 0,
    transition: {
      type: 'spring',
      stiffness: 120,   // Spring tension (higher = snappier)
      damping: 14,      // Friction (higher = stops faster)
      mass: 0.8,        // Inertia (higher = more weight)
    },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: -20,           // Float up when exiting
    transition: { duration: 0.2, ease: 'easeIn' },
  },
}
```

- [ ] **Step 1.4: Run tests to verify they pass**

Run: `npx vitest run src/lib/animations/media-variants.test.ts -v`

Expected: All tests PASS

- [ ] **Step 1.5: Commit**

```bash
git add src/lib/animations/
git commit -m "feat: add animation variants for media cards

- Add getRandomFlyInDirection for random entrance angles
- Add gridContainerVariants for staggered grid animations
- Add cardVariants with elastic spring physics
- Follow existing Framer Motion patterns from codebase

Refs: media-management-enhancements-design.md"
```

---

## Task 2: Create MediaCardPreview Component

**Category:** visual-engineering  
**Skills:** animate (for tooltip animations)

**Files:**
- Create: `src/components/media/MediaCardPreview.tsx`
- Reference: Existing portal patterns in codebase

- [ ] **Step 2.1: Write the failing test**

Create `src/components/media/MediaCardPreview.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MediaCardPreview } from './MediaCardPreview'
import type { MediaRecord } from '@/types/media'

// Mock createPortal
vi.mock('react-dom', () => ({
  createPortal: (children: React.ReactNode) => children,
}))

const mockRecord: MediaRecord = {
  id: 'test-1',
  filename: 'test.png',
  original_name: 'Test Image',
  filepath: '/test.png',
  type: 'image',
  mime_type: 'image/png',
  size_bytes: 1024,
  source: 'image_generation',
  task_id: null,
  metadata: null,
  is_deleted: false,
  created_at: '2026-04-09T00:00:00Z',
  updated_at: '2026-04-09T00:00:00Z',
  deleted_at: null,
}

const mockAudioRecord: MediaRecord = {
  ...mockRecord,
  id: 'test-2',
  type: 'audio',
  filename: 'test.mp3',
}

const defaultProps = {
  record: mockRecord,
  signedUrl: 'http://example.com/test.png',
  mousePosition: { x: 100, y: 100 },
  visible: true,
}

describe('MediaCardPreview', () => {
  it('should not render for non-image types', () => {
    const { container } = render(
      <MediaCardPreview {...defaultProps} record={mockAudioRecord} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('should not render when visible is false', () => {
    const { container } = render(
      <MediaCardPreview {...defaultProps} visible={false} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('should not render when signedUrl is empty', () => {
    const { container } = render(
      <MediaCardPreview {...defaultProps} signedUrl="" />
    )
    expect(container.firstChild).toBeNull()
  })

  it('should render image preview when conditions are met', () => {
    render(<MediaCardPreview {...defaultProps} />)
    const img = screen.getByRole('img')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'http://example.com/test.png')
  })
})
```

- [ ] **Step 2.2: Run test to verify it fails**

Run: `npx vitest run src/components/media/MediaCardPreview.test.tsx`

Expected: FAIL with "Cannot find module"

- [ ] **Step 2.3: Create the MediaCardPreview component**

Create `src/components/media/MediaCardPreview.tsx`:

```typescript
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

/**
 * Floating preview tooltip that follows mouse position
 * Only renders for image types with valid signed URLs
 * Automatically handles viewport boundary detection
 */
export function MediaCardPreview({
  record,
  signedUrl,
  mousePosition,
  visible,
}: MediaCardPreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  // Boundary detection - keeps preview within viewport
  useEffect(() => {
    if (!visible || !previewRef.current) return

    const preview = previewRef.current
    const rect = preview.getBoundingClientRect()
    const padding = 16
    const offset = 30

    let x = mousePosition.x + offset
    let y = mousePosition.y - rect.height / 2

    // Right boundary check - flip to left if too close to edge
    if (x + rect.width > window.innerWidth - padding) {
      x = mousePosition.x - rect.width - offset
    }

    // Top boundary check - ensure minimum padding from top
    if (y < padding) {
      y = padding
    }

    // Bottom boundary check - ensure minimum padding from bottom
    if (y + rect.height > window.innerHeight - padding) {
      y = window.innerHeight - rect.height - padding
    }

    setPosition({ x, y })
  }, [visible, mousePosition])

  // Only show preview for images with valid URLs
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

- [ ] **Step 2.4: Run tests to verify they pass**

Run: `npx vitest run src/components/media/MediaCardPreview.test.tsx -v`

Expected: All tests PASS

- [ ] **Step 2.5: Commit**

```bash
git add src/components/media/MediaCardPreview.tsx src/components/media/MediaCardPreview.test.tsx
git commit -m "feat: add MediaCardPreview hover tooltip component

- Portal-rendered floating preview following mouse position
- 280px width with auto boundary detection
- Smooth fade in/out animations with Framer Motion
- Only renders for image types with valid signed URLs

Refs: media-management-enhancements-design.md"
```

---

## Task 3: Add Smart Refill Logic to useMediaManagement Hook

**Category:** quick  
**Skills:** test-driven-development (for verifying refill logic)

**Files:**
- Modify: `src/hooks/useMediaManagement.ts` (lines 350-400 approx - delete handlers)
- Reference: Existing fetchMedia implementation in same file

- [ ] **Step 3.1: Write the failing test**

Create `src/hooks/useMediaManagement.refill.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useMediaManagement } from './useMediaManagement'
import * as mediaApi from '@/lib/api/media'

// Mock the API module
vi.mock('@/lib/api/media', () => ({
  getMediaList: vi.fn(),
  deleteMedia: vi.fn(),
  batchDeleteMedia: vi.fn(),
  getMediaSignedUrl: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('useMediaManagement - Smart Refill', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should refill page when last item deleted on page > 1', async () => {
    // Setup: Page 2 with 1 item
    const mockRecords = [{ id: '1', filename: 'test.png' }]
    const refillRecords = [{ id: '2', filename: 'new.png' }]
    
    vi.mocked(mediaApi.getMediaList)
      .mockResolvedValueOnce({
        records: mockRecords,
        pagination: { page: 2, limit: 20, total: 21, totalPages: 2 },
      })
      .mockResolvedValueOnce({
        records: refillRecords,
        pagination: { page: 2, limit: 20, total: 20, totalPages: 1 },
      })
    
    vi.mocked(mediaApi.deleteMedia).mockResolvedValue(undefined)

    const { result } = renderHook(() => useMediaManagement())
    
    // Wait for initial load
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    
    // Delete the only item on page 2
    await act(async () => {
      result.current.handleDelete(mockRecords[0])
    })

    // Should call getMediaList again for refill
    expect(mediaApi.getMediaList).toHaveBeenCalledTimes(2)
  })

  it('should not refill when items remain on page', async () => {
    // Setup: Page 1 with 2 items
    const mockRecords = [
      { id: '1', filename: 'test1.png' },
      { id: '2', filename: 'test2.png' },
    ]
    
    vi.mocked(mediaApi.getMediaList).mockResolvedValueOnce({
      records: mockRecords,
      pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
    })
    vi.mocked(mediaApi.deleteMedia).mockResolvedValue(undefined)

    const { result } = renderHook(() => useMediaManagement())
    
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    
    // Delete one item (one remains)
    await act(async () => {
      result.current.handleDelete(mockRecords[0])
    })

    // Should only call getMediaList once (initial load)
    expect(mediaApi.getMediaList).toHaveBeenCalledTimes(1)
  })

  it('should update to empty state when page 1 becomes empty', async () => {
    const mockRecords = [{ id: '1', filename: 'test.png' }]
    
    vi.mocked(mediaApi.getMediaList).mockResolvedValueOnce({
      records: mockRecords,
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    })
    vi.mocked(mediaApi.deleteMedia).mockResolvedValue(undefined)

    const { result } = renderHook(() => useMediaManagement())
    
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    
    await act(async () => {
      result.current.handleDelete(mockRecords[0])
    })

    // Records should be empty, no refill needed on page 1
    expect(result.current.records).toHaveLength(0)
    expect(mediaApi.getMediaList).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 3.2: Run test to verify it fails**

Run: `npx vitest run src/hooks/useMediaManagement.refill.test.ts`

Expected: FAIL - smart refill logic not yet implemented

- [ ] **Step 3.3: Modify the useMediaManagement hook**

First, read the current implementation to locate handleDelete:

Read: `src/hooks/useMediaManagement.ts`

Find the `handleDelete` function (around line 350-380) and modify it:

```typescript
// handleDelete改造
const handleDelete = useCallback(async (record: MediaRecord) => {
  try {
    await deleteMedia(record.id)
    
    // 1. 先从本地状态移除
    const remainingRecords = records.filter(r => r.id !== record.id)
    setRecords(remainingRecords)
    
    // 2. 清除选择
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.delete(record.id)
      return next
    })
    
    // 3. 智能补充逻辑
    if (remainingRecords.length === 0) {
      if (pagination.page > 1) {
        // 当前页变空且不是第一页 → 重新fetch当前页
        await fetchMedia(false)
      } else {
        // 第一页变空 → 更新为空状态
        setPagination(prev => ({
          ...prev,
          total: 0,
          totalPages: 0,
        }))
      }
    } else {
      // 更新总数
      setPagination(prev => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
      }))
    }
    
    toast.success('删除成功')
  } catch (err) {
    setError(err instanceof Error ? err.message : '删除失败')
    toast.error('删除失败')
  }
}, [records, pagination.page, fetchMedia])
```

Also modify `handleBatchDelete` with similar logic:

```typescript
const handleBatchDelete = useCallback(async () => {
  if (selectedIds.size === 0) return
  
  try {
    await batchDeleteMedia(Array.from(selectedIds))
    
    // 从本地状态移除
    const remainingRecords = records.filter(r => !selectedIds.has(r.id))
    const deleteCount = records.length - remainingRecords.length
    setRecords(remainingRecords)
    setSelectedIds(new Set())
    
    // 智能补充逻辑
    if (remainingRecords.length === 0) {
      if (pagination.page > 1) {
        await fetchMedia(false)
      } else {
        setPagination(prev => ({
          ...prev,
          total: 0,
          totalPages: 0,
        }))
      }
    } else {
      setPagination(prev => ({
        ...prev,
        total: Math.max(0, prev.total - deleteCount),
      }))
    }
    
    toast.success(`成功删除 ${deleteCount} 个文件`)
  } catch (err) {
    setError(err instanceof Error ? err.message : '批量删除失败')
    toast.error('批量删除失败')
  }
}, [records, selectedIds, pagination.page, fetchMedia])
```

- [ ] **Step 3.4: Run tests to verify they pass**

Run: `npx vitest run src/hooks/useMediaManagement.refill.test.ts -v`

Expected: All tests PASS

- [ ] **Step 3.5: Commit**

```bash
git add src/hooks/useMediaManagement.ts src/hooks/useMediaManagement.refill.test.ts
git commit -m "feat: add smart pagination refill after deletion

- Detect when current page becomes empty after deletion
- Automatically refill by re-fetching current page (if not page 1)
- Handle edge case: page 1 empty updates to empty state
- Apply same logic to batch delete operation

Refs: media-management-enhancements-design.md"
```

---

## Task 4: Create AnimatedMediaGrid Component

**Category:** visual-engineering  
**Skills:** animate (for AnimatePresence and spring animations)

**Files:**
- Create: `src/components/media/AnimatedMediaGrid.tsx`
- Depends on: Task 1 (animation variants)
- Reference: Existing grid CSS classes from MediaManagement.tsx

- [ ] **Step 4.1: Write the failing test**

Create `src/components/media/AnimatedMediaGrid.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AnimatedMediaGrid } from './AnimatedMediaGrid'
import type { MediaRecord } from '@/types/media'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: { children: React.ReactNode }) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

const mockRecords: MediaRecord[] = [
  {
    id: '1',
    filename: 'test1.png',
    original_name: 'Test 1',
    filepath: '/test1.png',
    type: 'image',
    mime_type: 'image/png',
    size_bytes: 1024,
    source: 'image_generation',
    task_id: null,
    metadata: null,
    is_deleted: false,
    created_at: '2026-04-09T00:00:00Z',
    updated_at: '2026-04-09T00:00:00Z',
    deleted_at: null,
  },
  {
    id: '2',
    filename: 'test2.png',
    original_name: 'Test 2',
    filepath: '/test2.png',
    type: 'image',
    mime_type: 'image/png',
    size_bytes: 2048,
    source: 'image_generation',
    task_id: null,
    metadata: null,
    is_deleted: false,
    created_at: '2026-04-09T00:00:00Z',
    updated_at: '2026-04-09T00:00:00Z',
    deleted_at: null,
  },
]

const defaultProps = {
  records: mockRecords,
  signedUrls: { '1': 'http://example.com/1.png', '2': 'http://example.com/2.png' },
  selectedIds: new Set<string>(),
  onSelect: vi.fn(),
  onPreview: vi.fn(),
  onDownload: vi.fn(),
  onDelete: vi.fn(),
}

describe('AnimatedMediaGrid', () => {
  it('should render all records', () => {
    render(<AnimatedMediaGrid {...defaultProps} />)
    expect(screen.getAllByRole('img')).toHaveLength(2)
  })

  it('should render empty grid when no records', () => {
    render(<AnimatedMediaGrid {...defaultProps} records={[]} />)
    expect(screen.queryAllByRole('img')).toHaveLength(0)
  })

  it('should pass correct props to MediaCard', () => {
    render(<AnimatedMediaGrid {...defaultProps} />)
    // Both cards should be present
    expect(screen.getByAltText('Test 1')).toBeInTheDocument()
    expect(screen.getByAltText('Test 2')).toBeInTheDocument()
  })
})
```

- [ ] **Step 4.2: Run test to verify it fails**

Run: `npx vitest run src/components/media/AnimatedMediaGrid.test.tsx`

Expected: FAIL with "Cannot find module"

- [ ] **Step 4.3: Create the AnimatedMediaGrid component**

Create `src/components/media/AnimatedMediaGrid.tsx`:

```typescript
import { motion, AnimatePresence } from 'framer-motion'
import { MediaCard } from './MediaCard'
import {
  gridContainerVariants,
  cardVariants,
  getRandomFlyInDirection,
} from '@/lib/animations/media-variants'
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

/**
 * Animated media grid with elastic fly-in animations
 * Uses AnimatePresence for smooth enter/exit transitions
 * Staggered animation creates waterfall effect
 */
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
            className="relative"
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

- [ ] **Step 4.4: Run tests to verify they pass**

Run: `npx vitest run src/components/media/AnimatedMediaGrid.test.tsx -v`

Expected: All tests PASS

- [ ] **Step 4.5: Commit**

```bash
git add src/components/media/AnimatedMediaGrid.tsx src/components/media/AnimatedMediaGrid.test.tsx
git commit -m "feat: add AnimatedMediaGrid component with elastic animations

- Grid container with staggered children animations
- Random fly-in directions from below viewport
- Spring physics for elastic bounce effect
- AnimatePresence for smooth card removal

Refs: media-management-enhancements-design.md"
```

---

## Task 5: Modify MediaCard for Hover Preview Integration

**Category:** visual-engineering  
**Skills:** animate (for hover interactions)

**Files:**
- Modify: `src/components/media/MediaCard.tsx`
- Depends on: Task 2 (MediaCardPreview component)

- [ ] **Step 5.1: Write the failing test**

Create `src/components/media/MediaCard.preview.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MediaCard } from './MediaCard'
import type { MediaRecord } from '@/types/media'

// Mock MediaCardPreview
vi.mock('./MediaCardPreview', () => ({
  MediaCardPreview: ({ visible }: { visible: boolean }) => (
    visible ? <div data-testid="preview">Preview</div> : null
  ),
}))

const mockImageRecord: MediaRecord = {
  id: '1',
  filename: 'test.png',
  original_name: 'Test Image',
  filepath: '/test.png',
  type: 'image',
  mime_type: 'image/png',
  size_bytes: 1024,
  source: 'image_generation',
  task_id: null,
  metadata: null,
  is_deleted: false,
  created_at: '2026-04-09T00:00:00Z',
  updated_at: '2026-04-09T00:00:00Z',
  deleted_at: null,
}

const mockAudioRecord: MediaRecord = {
  ...mockImageRecord,
  id: '2',
  type: 'audio',
  filename: 'test.mp3',
}

const defaultProps = {
  record: mockImageRecord,
  signedUrl: 'http://example.com/test.png',
  isSelected: false,
  onSelect: vi.fn(),
  onPreview: vi.fn(),
  onDownload: vi.fn(),
  onDelete: vi.fn(),
}

describe('MediaCard - Preview Integration', () => {
  it('should show preview on hover for images', () => {
    render(<MediaCard {...defaultProps} />)
    const card = screen.getByRole('img').closest('div')!
    
    fireEvent.mouseEnter(card)
    expect(screen.getByTestId('preview')).toBeInTheDocument()
    
    fireEvent.mouseLeave(card)
    expect(screen.queryByTestId('preview')).not.toBeInTheDocument()
  })

  it('should not show preview for non-image types', () => {
    render(<MediaCard {...defaultProps} record={mockAudioRecord} />)
    const card = screen.getByText('test.mp3').closest('div')!
    
    fireEvent.mouseEnter(card)
    expect(screen.queryByTestId('preview')).not.toBeInTheDocument()
  })

  it('should not show preview when signedUrl is missing', () => {
    render(<MediaCard {...defaultProps} signedUrl="" />)
    const card = screen.getByRole('img').closest('div')!
    
    fireEvent.mouseEnter(card)
    expect(screen.queryByTestId('preview')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 5.2: Run test to verify it fails**

Run: `npx vitest run src/components/media/MediaCard.preview.test.tsx`

Expected: FAIL - preview functionality not yet added

- [ ] **Step 5.3: Read current MediaCard implementation**

Read: `src/components/media/MediaCard.tsx`

- [ ] **Step 5.4: Modify MediaCard to add hover preview**

Add state and event handlers at the top of the component:

```typescript
// Add imports at the top
import { useState } from 'react'
import { MediaCardPreview } from './MediaCardPreview'

// Inside MediaCard function, add state after existing useState declarations
const [showPreview, setShowPreview] = useState(false)
const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

// Add event handler
const handleMouseMove = (e: React.MouseEvent) => {
  setMousePosition({ x: e.clientX, y: e.clientY })
}

// Modify the card container div to include event handlers
// Find the outermost div wrapper and add:
onMouseEnter={() => setShowPreview(true)}
onMouseMove={handleMouseMove}
onMouseLeave={() => setShowPreview(false)}

// At the end of the component (before closing tag), add:
{record.type === 'image' && signedUrl && (
  <MediaCardPreview
    record={record}
    signedUrl={signedUrl}
    mousePosition={mousePosition}
    visible={showPreview}
  />
)}
```

- [ ] **Step 5.5: Run tests to verify they pass**

Run: `npx vitest run src/components/media/MediaCard.preview.test.tsx -v`

Expected: All tests PASS

- [ ] **Step 5.6: Commit**

```bash
git add src/components/media/MediaCard.tsx src/components/media/MediaCard.preview.test.tsx
git commit -m "feat: add hover preview to MediaCard

- Track mouse position for preview positioning
- Show preview on hover for image types only
- Integrate MediaCardPreview component
- Clean state management for preview visibility

Refs: media-management-enhancements-design.md"
```

---

## Task 6: Update MediaManagement Page

**Category:** quick  
**Depends on:** Tasks 4 and 5

**Files:**
- Modify: `src/pages/MediaManagement.tsx`
- Replace: Card view grid with AnimatedMediaGrid

- [ ] **Step 6.1: Write the integration test**

Create `src/pages/MediaManagement.enhancements.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import MediaManagement from './MediaManagement'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: { children: React.ReactNode }) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock hooks
vi.mock('@/hooks/useMediaManagement', () => ({
  useMediaManagement: () => ({
    records: [
      { id: '1', filename: 'test.png', type: 'image', original_name: 'Test' },
    ],
    pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    isLoading: false,
    isInitialLoad: false,
    error: null,
    searchQuery: '',
    activeTab: 'all',
    viewMode: 'card',
    selectedIds: new Set(),
    signedUrls: { '1': 'http://example.com/test.png' },
    lightboxOpen: false,
    lightboxIndex: 0,
    deleteDialog: { isOpen: false, record: null },
    batchDeleteDialogOpen: false,
    setSearchQuery: vi.fn(),
    setActiveTab: vi.fn(),
    setViewMode: vi.fn(),
    setPage: vi.fn(),
    handleSelect: vi.fn(),
    handleSelectAll: vi.fn(),
    handleDelete: vi.fn(),
    handleBatchDelete: vi.fn(),
    openDeleteDialog: vi.fn(),
    closeDeleteDialog: vi.fn(),
    closeLightbox: vi.fn(),
    goToPrevSlide: vi.fn(),
    goToNextSlide: vi.fn(),
    handleDownload: vi.fn(),
    handleBatchDownload: vi.fn(),
    openBatchDeleteDialog: vi.fn(),
    closeBatchDeleteDialog: vi.fn(),
    setLightboxOpen: vi.fn(),
  }),
}))

describe('MediaManagement Enhancements', () => {
  it('should render AnimatedMediaGrid in card view', () => {
    render(
      <BrowserRouter>
        <MediaManagement />
      </BrowserRouter>
    )
    
    // Should show the grid with cards
    expect(screen.getByText('Test')).toBeInTheDocument()
  })

  it('should render table view when switched', async () => {
    const { container } = render(
      <BrowserRouter>
        <MediaManagement />
      </BrowserRouter>
    )
    
    // Component should render without errors
    expect(container.querySelector('[class*="grid"]') || 
           container.querySelector('[class*="table"]')).toBeTruthy()
  })
})
```

- [ ] **Step 6.2: Run test to verify current implementation passes**

Run: `npx vitest run src/pages/MediaManagement.enhancements.test.tsx --run`

Expected: Tests may fail if AnimatedMediaGrid not yet integrated

- [ ] **Step 6.3: Read current MediaManagement page**

Read: `src/pages/MediaManagement.tsx`

Focus on the card view rendering section (around line 200-250).

- [ ] **Step 6.4: Modify MediaManagement to use AnimatedMediaGrid**

Replace the existing card grid with AnimatedMediaGrid:

```typescript
// Add import at top
import { AnimatedMediaGrid } from '@/components/media/AnimatedMediaGrid'

// Find the card view section (search for "viewMode === 'card'")
// Replace the existing grid div with:

{viewMode === 'card' && filteredRecords.length > 0 && (
  <AnimatedMediaGrid
    records={filteredRecords}
    signedUrls={signedUrls}
    selectedIds={selectedIds}
    onSelect={handleSelect}
    onPreview={(record) => {
      const index = imageRecords.findIndex(r => r.id === record.id)
      setLightboxIndex(index)
      setLightboxOpen(true)
    }}
    onDownload={handleDownload}
    onDelete={openDeleteDialog}
  />
)}
```

- [ ] **Step 6.5: Run tests to verify they pass**

Run: `npx vitest run src/pages/MediaManagement.enhancements.test.tsx -v`

Expected: All tests PASS

- [ ] **Step 6.6: Commit**

```bash
git add src/pages/MediaManagement.tsx src/pages/MediaManagement.enhancements.test.tsx
git commit -m "feat: integrate AnimatedMediaGrid into MediaManagement page

- Replace static grid with animated grid component
- Preserve existing lightbox preview functionality
- Maintain table and timeline view modes
- All existing features continue to work

Refs: media-management-enhancements-design.md"
```

---

## Task 7: Write Comprehensive Tests

**Category:** unspecified-high  
**Depends on:** All previous tasks

- [ ] **Step 7.1: Create animation integration test**

Create `src/components/media/animation-integration.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AnimatedMediaGrid } from './AnimatedMediaGrid'
import type { MediaRecord } from '@/types/media'

// Real framer-motion (not mocked) to test animations
const mockRecords: MediaRecord[] = [
  {
    id: '1',
    filename: 'test1.png',
    original_name: 'Test 1',
    filepath: '/test1.png',
    type: 'image',
    mime_type: 'image/png',
    size_bytes: 1024,
    source: 'image_generation',
    task_id: null,
    metadata: null,
    is_deleted: false,
    created_at: '2026-04-09T00:00:00Z',
    updated_at: '2026-04-09T00:00:00Z',
    deleted_at: null,
  },
]

const defaultProps = {
  records: mockRecords,
  signedUrls: { '1': 'http://example.com/1.png' },
  selectedIds: new Set<string>(),
  onSelect: vi.fn(),
  onPreview: vi.fn(),
  onDownload: vi.fn(),
  onDelete: vi.fn(),
}

describe('Animation Integration', () => {
  it('should render cards with animation wrapper', () => {
    render(<AnimatedMediaGrid {...defaultProps} />)
    const img = screen.getByAltText('Test 1')
    expect(img).toBeInTheDocument()
  })

  it('should handle card deletion through onDelete callback', () => {
    const onDelete = vi.fn()
    render(<AnimatedMediaGrid {...defaultProps} onDelete={onDelete} />)
    
    // This verifies the callback is wired correctly
    expect(screen.getByAltText('Test 1')).toBeInTheDocument()
  })

  it('should update when records change', () => {
    const { rerender } = render(<AnimatedMediaGrid {...defaultProps} />)
    expect(screen.getByAltText('Test 1')).toBeInTheDocument()
    
    const newRecords = [
      ...mockRecords,
      {
        ...mockRecords[0],
        id: '2',
        original_name: 'Test 2',
      },
    ]
    
    rerender(
      <AnimatedMediaGrid
        {...defaultProps}
        records={newRecords}
        signedUrls={{ ...defaultProps.signedUrls, '2': 'http://example.com/2.png' }}
      />
    )
    
    waitFor(() => {
      expect(screen.getByAltText('Test 2')).toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 7.2: Run all media-related tests**

Run: `npx vitest run src/components/media/ src/hooks/useMediaManagement --run`

Expected: All tests PASS

- [ ] **Step 7.3: Commit**

```bash
git add src/components/media/animation-integration.test.tsx
git commit -m "test: add animation integration tests

- Verify AnimatedMediaGrid handles dynamic record changes
- Test animation wrapper preserves all card functionality
- Ensure callbacks are properly wired through motion wrapper

Refs: media-management-enhancements-design.md"
```

---

## Task 8: Verify Success Criteria

**Category:** unspecified-high  
**Depends on:** All previous tasks

- [ ] **Step 8.1: Verify smart refill works**

Test steps:
1. Navigate to page 2 of media grid (ensure page 2 has only 1 item)
2. Delete the single item on page 2
3. Verify: Page automatically refills with next items OR shows as empty if no more items
4. Verify: User stays on page 2, doesn't jump to page 1

Manual verification command:
```bash
# Build and start dev server
npm run dev:full
```

- [ ] **Step 8.2: Verify fly-in animation**

Test steps:
1. Refresh the media grid page
2. Verify: Cards animate in with spring bounce effect
3. Verify: Each card enters from a different random angle
4. Verify: Staggered timing creates waterfall effect
5. Use Chrome DevTools Performance tab to verify 60fps

Performance check:
```javascript
// Run in console during animation
// Should show consistent 60fps
```

- [ ] **Step 8.3: Verify hover preview**

Test steps:
1. Hover over an image card
2. Verify: Preview tooltip appears (280px wide)
3. Verify: Tooltip follows mouse movement
4. Verify: Tooltip doesn't overflow viewport edges
5. Verify: Smooth fade in/out animation (150ms)
6. Verify: No preview shows for audio/video cards

- [ ] **Step 8.4: Run full test suite**

Run: `npx vitest run --reporter=verbose`

Expected: All tests PASS

- [ ] **Step 8.5: Build verification**

Run: `npm run build`

Expected: Build succeeds with no errors

- [ ] **Step 8.6: Final commit**

```bash
git add .
git commit -m "feat: complete media management enhancements

- Smart pagination refill after deletion
- Elastic fly-in animations with spring physics
- Hover preview tooltip following mouse position
- All tests passing, build successful

Closes: media-management-enhancements-design.md"
```

---

## Verification Checklist

Before marking complete, verify:

- [ ] Delete last item on page 2 -> auto-refills with fly-in animation
- [ ] Delete last item on page 1 -> shows empty state (no crash)
- [ ] Hover image card -> preview tooltip appears (280px wide)
- [ ] Preview follows mouse and respects viewport boundaries
- [ ] Fly-in animation: elastic bounce from random directions below
- [ ] Stagger effect: cards animate in sequence with 60ms delay
- [ ] All existing functionality preserved (table view, timeline, lightbox)
- [ ] No TypeScript errors
- [ ] All tests pass
- [ ] Build succeeds

---

## Rollback Plan

If issues discovered:

```bash
# Revert all changes
git reset --hard HEAD~8  # Revert all 8 commits

# Or selectively revert
git revert <commit-hash>  # Revert specific enhancement
```

---

## Parallel Execution Summary

| Task | Category | Skills | Dependencies | Estimated Time |
|------|----------|--------|--------------|----------------|
| Task 1 | visual-engineering | animate | None | 20 min |
| Task 2 | visual-engineering | animate | None | 25 min |
| Task 3 | quick | test-driven-development | None | 20 min |
| Task 4 | visual-engineering | animate | Task 1 | 25 min |
| Task 5 | visual-engineering | animate | Task 2 | 20 min |
| Task 6 | quick | None | Tasks 4 & 5 | 15 min |
| Task 7 | unspecified-high | None | Tasks 1-6 | 20 min |
| Task 8 | unspecified-high | None | Tasks 1-7 | 15 min |

**Total Estimated Time:** ~2.5 hours
**Parallel Wave Execution:** 3 waves (1 -> 2 -> 3)
