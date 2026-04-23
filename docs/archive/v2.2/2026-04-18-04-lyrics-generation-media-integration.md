# 歌词生成功能 - Media Integration 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将歌词预览组件集成到 MediaManagement 系统中，包括 MediaCard、MediaTableView、sidebar 导航和路由注册。

**Architecture:** 扩展 media constants（TYPE_VARIANTS/LABELS/GRADIENTS），扩展 getTypeIcon，MediaCard 添加 lyrics preview 按钮，Sidebar 添加导航项，App.tsx 添加路由。

**Tech Stack:** React 18, TypeScript, Tailwind CSS, React Router

**Spec:** @docs/specs/lyrics-generation-design.md
**Depends on:** 
- @docs/plans/2026-04-18-01-lyrics-generation-backend.md
- @docs/plans/2026-04-18-02-lyrics-generation-frontend.md
- @docs/plans/2026-04-18-03-lyrics-generation-preview.md

---

## File Structure

**Modify:**
- `src/lib/constants/media.tsx` - add lyrics constants
- `src/lib/utils/media.tsx` - add lyrics icon
- `src/components/media/MediaCard.tsx` - add lyrics preview button
- `src/components/media/MediaCardPreview.tsx` - extend for lyrics type
- `src/components/media/MediaTableView.tsx` - add lyrics preview action
- `src/components/layout/Sidebar.tsx` - add lyrics nav item
- `src/App.tsx` - add lyrics route
- `src/hooks/index.ts` - add LYRICS_GENERATION form key

---

## Task 1: Media Constants Extension

**Files:**
- Modify: `src/lib/constants/media.tsx`

- [ ] **Step 1: Extend TYPE_VARIANTS, TYPE_LABELS, TYPE_GRADIENTS**

```tsx
// src/lib/constants/media.tsx (extend existing constants)

import { Image, Music, Video, FileAudio, FileText, RefreshCw } from 'lucide-react'
import type { MediaType, MediaSource } from '@/types/media'
import { services } from '@/themes/tokens'

export const MEDIA_TABS: { value: string; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: '全部', icon: <RefreshCw className="w-4 h-4" /> },
  { value: 'image', label: '图片', icon: <Image className="w-4 h-4" /> },
  { value: 'audio', label: '音频', icon: <FileAudio className="w-4 h-4" /> },
  { value: 'video', label: '视频', icon: <Video className="w-4 h-4" /> },
  { value: 'music', label: '音乐', icon: <Music className="w-4 h-4" /> },
  { value: 'lyrics', label: '歌词', icon: <FileText className="w-4 h-4" /> },
]

export const TYPE_VARIANTS: Record<MediaType, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  image: 'default',
  audio: 'secondary',
  video: 'destructive',
  music: 'outline',
  lyrics: 'outline',
}

export const TYPE_LABELS: Record<MediaType, string> = {
  image: '图片',
  audio: '音频',
  video: '视频',
  music: '音乐',
  lyrics: '歌词',
}

export const SOURCE_LABELS: Record<MediaSource, string> = {
  voice_sync: '语音同步',
  voice_async: '语音异步',
  image_generation: '图像生成',
  video_generation: '视频生成',
  music_generation: '音乐生成',
  lyrics_generation: '歌词生成',
}

export const TYPE_GRADIENTS: Record<MediaType, string> = {
  image: 'bg-muted/50',
  audio: services.voice.bg,
  video: 'bg-destructive-950/50',
  music: services.music.bg,
  lyrics: 'bg-purple-950/50',
}
```

- [ ] **Step 2: Verify constants compile**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/constants/media.tsx
git commit -m "feat(constants): add lyrics media constants"
```

---

## Task 2: Media Utils Extension - getTypeIcon

**Files:**
- Modify: `src/lib/utils/media.tsx`

- [ ] **Step 1: Add lyrics icon case**

```tsx
// src/lib/utils/media.tsx (modify getTypeIcon function)

import { Image, Music, Video, FileAudio, FileText } from 'lucide-react'
import type { MediaType } from '@/types/media'

export function getTypeIcon(type: MediaType): React.ReactNode {
  switch (type) {
    case 'image':
      return <Image className="w-4 h-4" />
    case 'audio':
      return <FileAudio className="w-4 h-4" />
    case 'video':
      return <Video className="w-4 h-4" />
    case 'music':
      return <Music className="w-4 h-4" />
    case 'lyrics':
      return <FileText className="w-4 h-4" />
    default:
      return <FileAudio className="w-4 h-4" />
  }
}
```

- [ ] **Step 2: Verify utils compile**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/utils/media.tsx
git commit -m "feat(utils): add lyrics icon to getTypeIcon"
```

---

## Task 3: MediaCard - Add Lyrics Preview Button

**Files:**
- Modify: `src/components/media/MediaCard.tsx`

- [ ] **Step 1: Add preview button for lyrics type**

Find the action buttons section (around line 124) and extend to include lyrics:

```tsx
// src/components/media/MediaCard.tsx (extend action buttons section)

// In the hover actions area, add lyrics preview condition
{record.type === 'lyrics' && (
  <Button
    variant="ghost"
    size="icon"
    className="h-8 w-8"
    onClick={(e) => {
      e.stopPropagation()
      onPreview?.(record)
    }}
  >
    <Eye className="w-4 h-4" />
  </Button>
)}
```

Note: The existing code likely has `onPreview` callback. Add the lyrics type check similar to image/audio/music.

- [ ] **Step 2: Verify MediaCard compiles**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/media/MediaCard.tsx
git commit -m "feat(MediaCard): add lyrics preview button"
```

---

## Task 4: MediaCardPreview - Extend for Lyrics Type

**Files:**
- Modify: `src/components/media/MediaCardPreview.tsx`

- [ ] **Step 1: Import and use LyricsHoverPreview**

```tsx
// src/components/media/MediaCardPreview.tsx (modify to support lyrics)

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import type { MediaRecord } from '@/types/media'
import { LyricsHoverPreview } from '@/components/lyrics'

interface MediaCardPreviewProps {
  record: MediaRecord
  signedUrl?: string  // Make optional for lyrics
  mousePosition: { x: number; y: number }
  visible: boolean
}

export function MediaCardPreview({
  record,
  signedUrl,
  mousePosition,
  visible,
}: MediaCardPreviewProps) {
  // For lyrics, use LyricsHoverPreview
  if (record.type === 'lyrics') {
    return (
      <LyricsHoverPreview
        record={record}
        mousePosition={mousePosition}
        visible={visible}
      />
    )
  }

  // For image, use existing image preview (unchanged)
  if (record.type !== 'image' || !signedUrl) return null

  // ... existing image preview logic unchanged ...
}
```

- [ ] **Step 2: Verify preview compiles**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/media/MediaCardPreview.tsx
git commit -m "feat(MediaCardPreview): support lyrics hover preview"
```

---

## Task 5: MediaTableView - Add Lyrics Preview Action

**Files:**
- Modify: `src/components/media/MediaTableView.tsx`

- [ ] **Step 1: Add lyrics preview action**

Find the preview button section and extend the type check:

```tsx
// src/components/media/MediaTableView.tsx (extend preview button)

// In the preview button condition, add lyrics type
{(record.type === 'image' || record.type === 'audio' || record.type === 'music' || record.type === 'lyrics') && (
  <Button
    variant="ghost"
    size="sm"
    onClick={() => handlePreview(record)}
  >
    <Eye className="w-4 h-4 mr-1" />
    查看
  </Button>
)}
```

- [ ] **Step 2: Import LyricsPreviewModal and add modal state**

```tsx
// Add at top of MediaTableView.tsx
import { useState } from 'react'
import { LyricsPreviewModal } from '@/components/lyrics'

// Add modal state inside component
const [lyricsPreviewOpen, setLyricsPreviewOpen] = useState(false)
const [lyricsPreviewRecord, setLyricsPreviewRecord] = useState<MediaRecord | null>(null)

// Add handlePreview function
const handlePreview = (record: MediaRecord) => {
  if (record.type === 'lyrics') {
    setLyricsPreviewRecord(record)
    setLyricsPreviewOpen(true)
  } else if (record.type === 'image') {
    // existing image preview logic
  } else if (record.type === 'audio' || record.type === 'music') {
    // existing audio/music preview logic
  }
}

// Add modal in render
{lyricsPreviewRecord && (
  <LyricsPreviewModal
    record={lyricsPreviewRecord}
    open={lyricsPreviewOpen}
    onOpenChange={setLyricsPreviewOpen}
  />
)}
```

- [ ] **Step 3: Verify MediaTableView compiles**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/media/MediaTableView.tsx
git commit -m "feat(MediaTableView): add lyrics preview action"
```

---

## Task 6: Sidebar - Add Lyrics Navigation

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Add lyrics nav item**

Find the debugItems array (around line 118-126) and add lyrics entry:

```tsx
// src/components/layout/Sidebar.tsx (add to debugItems array)

import { FileText } from 'lucide-react'

const debugItems = [
  { path: '/text', label: t('sidebar.textGeneration'), icon: MessageSquare },
  { path: '/voice/sync', label: t('sidebar.voiceSync'), icon: Mic },
  { path: '/voice/async', label: t('sidebar.voiceAsync'), icon: Mic },
  { path: '/image', label: t('sidebar.imageGeneration'), icon: Image },
  { path: '/music', label: t('sidebar.musicGeneration'), icon: Music },
  { path: '/lyrics', label: t('sidebar.lyricsGeneration'), icon: FileText },  // Add this
  { path: '/video', label: t('sidebar.videoGeneration'), icon: Video },
  { path: '/video-agent', label: t('sidebar.videoAgent'), icon: Video },
]
```

- [ ] **Step 2: Verify Sidebar compiles**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat(Sidebar): add lyrics navigation"
```

---

## Task 7: App.tsx - Add Lyrics Route

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add lazy import**

Find the lazy imports section (around line 17-19):

```tsx
// src/App.tsx (add lazy import)

import { lazy } from 'react'

const TextGeneration = lazy(() => import('@/pages/TextGeneration'))
const VoiceSync = lazy(() => import('@/pages/VoiceSync'))
const VoiceAsync = lazy(() => import('@/pages/VoiceAsync'))
const ImageGeneration = lazy(() => import('@/pages/ImageGeneration'))
const MusicGeneration = lazy(() => import('@/pages/MusicGeneration'))
const LyricsGeneration = lazy(() => import('@/pages/LyricsGeneration'))  // Add this
const VideoGeneration = lazy(() => import('@/pages/VideoGeneration'))
```

- [ ] **Step 2: Add route element**

Find the Route elements section (around line 160-200):

```tsx
// src/App.tsx (add route element)

<Route path="lyrics" element={
  <RouteWithErrorBoundary pageName="歌词生成">
    <LyricsGeneration />
  </RouteWithErrorBoundary>
} />
```

- [ ] **Step 3: Verify App.tsx compiles**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat(App): add lyrics route"
```

---

## Task 8: Form Persistence Key

**Files:**
- Modify: `src/hooks/index.ts` or `src/hooks/useFormPersistence.ts`

- [ ] **Step 1: Add LYRICS_GENERATION form key**

```typescript
// src/hooks/index.ts (extend DEBUG_FORM_KEYS)

export const DEBUG_FORM_KEYS = {
  TEXT_GENERATION: 'debug-text-generation',
  VOICE_SYNC: 'debug-voice-sync',
  VOICE_ASYNC: 'debug-voice-async',
  IMAGE_GENERATION: 'debug-image-generation',
  MUSIC_GENERATION: 'debug-music-generation',
  LYRICS_GENERATION: 'debug-lyrics-generation',  // Add this
  VIDEO_GENERATION: 'debug-video-generation',
}
```

- [ ] **Step 2: Verify hooks compile**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/hooks/index.ts
git commit -m "feat(hooks): add LYRICS_GENERATION form key"
```

---

## Task 9: Final Verification

- [ ] **Step 1: Run frontend tests**

Run: `vitest run src/`
Expected: All tests pass (or pre-existing failures noted)

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: Exit code 0

- [ ] **Step 3: Check TypeScript diagnostics**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Manual UI test (optional)**

1. Start dev server
2. Navigate to `/lyrics` route
3. Verify page renders correctly
4. Navigate to MediaManagement
5. Filter by 'lyrics' tab (if lyrics records exist)
6. Verify hover preview shows correctly

---

## Completion Checklist

- [ ] Media constants extended (TYPE_VARIANTS/LABELS/GRADIENTS)
- [ ] getTypeIcon handles 'lyrics' type
- [ ] MediaCard shows preview button for lyrics
- [ ] MediaCardPreview supports lyrics hover preview
- [ ] MediaTableView has lyrics preview action
- [ ] Sidebar includes lyrics navigation
- [ ] App.tsx registers lyrics route
- [ ] Form persistence key added
- [ ] All tests pass
- [ ] Build succeeds
- [ ] All changes committed