# UI Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance UI across 4 pages with glassmorphism effects, enlarge media management filters, and upgrade music carousel visuals.

**Architecture:** Apply ImageGeneration's glassmorphism pattern (gradient glow + backdrop-blur + shadow) to MusicGeneration, VideoGeneration, VideoAgent. Enlarge filter buttons in MediaManagement. Add spring animations to MusicTaskCard.

**Tech Stack:** React, Tailwind CSS, framer-motion

**Design Spec:** @docs/specs/2026-04-15-ui-enhancement-design.md

---

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `src/pages/MediaManagement.tsx` | Modify | Enlarge filter buttons (lines 138-216) |
| `src/components/music/MusicTaskCard.tsx` | Modify | Add glassmorphism + spring animations |
| `src/components/music/MusicCarousel.tsx` | Modify | Add container glass effect |
| `src/pages/MusicGeneration.tsx` | Modify | Apply glassmorphism to main cards |
| `src/pages/VideoGeneration.tsx` | Modify | Apply glassmorphism to all cards |
| `src/pages/VideoAgent.tsx` | Modify | Apply glassmorphism to all cards |

---

## Task 1: Media Management Filter Enlargement

**Files:**
- Modify: `src/pages/MediaManagement.tsx:138-216`

- [ ] **Step 1: Locate filter button container**

Read file to find the filter section (收藏/开放 筛选项):

```bash
grep -n "收藏\|开放" src/pages/MediaManagement.tsx | head -20
```

Expected: Find lines around 138-216 containing filter buttons with `h-7`, `text-xs`, `px-2.5`

- [ ] **Step 2: Update button heights and padding**

Change filter button styling from:
```tsx
className="h-7 px-2.5 text-xs"
```
To:
```tsx
className="h-8 px-3 text-sm"
```

- [ ] **Step 3: Update icon sizes**

Change icon from:
```tsx
className="w-3.5 h-3.5"
```
To:
```tsx
className="w-4 h-4"
```

- [ ] **Step 4: Update container padding**

Change container from:
```tsx
className="p-1"
```
To:
```tsx
className="p-1.5"
```

- [ ] **Step 5: Verify in browser**

Run dev server and check MediaManagement page:
```bash
node scripts/dev.js log | tail -30
```
Navigate to `/media` and verify buttons are larger.

- [ ] **Step 6: Commit**

```bash
git add src/pages/MediaManagement.tsx
git commit -m "feat(ui): enlarge media management filter buttons"
```

---

## Task 2: MusicTaskCard Glassmorphism

**Files:**
- Modify: `src/components/music/MusicTaskCard.tsx`

- [ ] **Step 1: Read current card structure**

Read the component to understand the card wrapper structure:
```bash
head -80 src/components/music/MusicTaskCard.tsx
```

Expected: Find card wrapper using `bg-card/80` without backdrop-blur

- [ ] **Step 2: Add glassmorphism wrapper**

Wrap the card with gradient glow pattern. Locate the main card div and wrap it:

```tsx
// Before (around line 60-80):
<div className={cn("bg-card/80 border rounded-xl p-4", ...)}>

// After:
<div className="relative group">
  <div className="absolute -inset-0.5 bg-gradient-to-r from-accent/20 via-primary/20 to-secondary/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
  <div className={cn("relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl overflow-hidden p-4", ...)}>
```

- [ ] **Step 3: Add status-based gradient backgrounds**

Add gradient background based on status:

```tsx
// In the inner card div className, add:
status === 'generating' && "bg-gradient-to-br from-blue-500/5 to-purple-500/5",
status === 'completed' && "bg-gradient-to-br from-green-500/5 to-emerald-500/5",
status === 'failed' && "bg-gradient-to-br from-red-500/5 to-orange-500/5",
```

- [ ] **Step 4: Enhance progress bar with glow**

Locate progress bar and add shadow glow:

```tsx
// Before:
<div className="h-2 bg-secondary rounded-full overflow-hidden">

// After:
<div className="h-2 bg-secondary rounded-full overflow-hidden shadow-lg shadow-blue-500/50">
```

- [ ] **Step 5: Update framer-motion to spring physics**

Change animation variants from fixed duration to spring:

```tsx
// Before (around line 35-42):
const taskVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
  },
}

// After:
const taskVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30
    },
  },
}
```

- [ ] **Step 6: Add button interaction feedback**

Add whileHover/whileTap to action buttons:

```tsx
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  ...
>
```

- [ ] **Step 7: Verify changes**

Check MusicGeneration page with batch carousel:
```bash
# View updated component
head -120 src/components/music/MusicTaskCard.tsx
```

- [ ] **Step 8: Commit**

```bash
git add src/components/music/MusicTaskCard.tsx
git commit -m "feat(ui): add glassmorphism and spring animations to MusicTaskCard"
```

---

## Task 3: MusicCarousel Container Enhancement

**Files:**
- Modify: `src/components/music/MusicCarousel.tsx`

- [ ] **Step 1: Read carousel structure**

```bash
cat src/components/music/MusicCarousel.tsx
```

Expected: Find the carousel container div

- [ ] **Step 2: Add glass container wrapper**

Wrap the carousel with glass effect:

```tsx
// Add outer wrapper with glass effect:
<div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-xl p-4">
  {/* existing carousel content */}
</div>
```

- [ ] **Step 3: Update navigation button styling**

Add shadow to navigation buttons:

```tsx
className="shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
```

- [ ] **Step 4: Commit**

```bash
git add src/components/music/MusicCarousel.tsx
git commit -m "feat(ui): add glass container to MusicCarousel"
```

---

## Task 4: MusicGeneration Page Glassmorphism

**Files:**
- Modify: `src/pages/MusicGeneration.tsx`

- [ ] **Step 1: Read page structure**

```bash
head -150 src/pages/MusicGeneration.tsx
```

Expected: Find Card components that need glassmorphism

- [ ] **Step 2: Identify card components**

Find lines using `<Card>` that wrap prompt input and parameters. Expected around lines 50-150.

- [ ] **Step 3: Apply glassmorphism to prompt card**

Replace Card with glassmorphism pattern:

```tsx
// Before:
<Card>
  <CardHeader>...</CardHeader>
  <CardContent>...</CardContent>
</Card>

// After:
<div className="relative group">
  <div className="absolute -inset-0.5 bg-gradient-to-r from-accent/20 via-primary/20 to-secondary/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
  <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl overflow-hidden">
    <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
      {/* Header content */}
    </div>
    <div className="p-4">
      {/* Body content */}
    </div>
  </div>
</div>
```

- [ ] **Step 4: Apply to parameter card**

Same glassmorphism pattern for parameter/settings card.

- [ ] **Step 5: Add motion wrapper for animations**

Wrap each card with motion.div for entrance animations:

```tsx
<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ type: "spring", stiffness: 300, damping: 30 }}
  className="relative group"
>
```

- [ ] **Step 6: Update generate button styling**

Add shadow and hover effects:

```tsx
className="shadow-lg shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30"
```

- [ ] **Step 7: Commit**

```bash
git add src/pages/MusicGeneration.tsx
git commit -m "feat(ui): apply glassmorphism to MusicGeneration page cards"
```

---

## Task 5: VideoGeneration Page Glassmorphism

**Files:**
- Modify: `src/pages/VideoGeneration.tsx:189-371`

- [ ] **Step 1: Read page structure**

```bash
head -400 src/pages/VideoGeneration.tsx
```

Expected: Find Card components around lines 191-370

- [ ] **Step 2: Apply glassmorphism to prompt card (lines ~191-272)**

Replace Card with glass pattern:

```tsx
// Before:
<Card className="xl:col-span-5">

// After:
<motion.div 
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ type: "spring", stiffness: 300, damping: 30 }}
  className="xl:col-span-5 relative group"
>
  <div className="absolute -inset-0.5 bg-gradient-to-r from-accent/20 via-primary/20 to-secondary/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
  <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl overflow-hidden">
    {/* Card content */}
  </div>
</motion.div>
```

- [ ] **Step 3: Apply glassmorphism to tips card (lines ~274-286)**

Same pattern for usage tips card.

- [ ] **Step 4: Apply glassmorphism to task list card (lines ~290-370)**

Same pattern for the right column task list card.

- [ ] **Step 5: Update task item styling (line ~309)**

Change task items from:
```tsx
className="border rounded-lg p-4"
```
To:
```tsx
className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-4"
```

- [ ] **Step 6: Add motion imports**

Ensure framer-motion is imported:
```tsx
import { motion } from 'framer-motion'
```

- [ ] **Step 7: Commit**

```bash
git add src/pages/VideoGeneration.tsx
git commit -m "feat(ui): apply glassmorphism to VideoGeneration page"
```

---

## Task 6: VideoAgent Page Glassmorphism

**Files:**
- Modify: `src/pages/VideoAgent.tsx`

- [ ] **Step 1: Read page structure**

```bash
head -400 src/pages/VideoAgent.tsx
```

Expected: Find Card components and template cards

- [ ] **Step 2: Apply glassmorphism to agent dialog card (line ~249)**

Replace Card with glass pattern:

```tsx
<div className="relative group">
  <div className="absolute -inset-0.5 bg-gradient-to-r from-accent/20 via-primary/20 to-secondary/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
  <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl overflow-hidden">
    {/* Card content */}
  </div>
</div>
```

- [ ] **Step 3: Update template cards (line ~266)**

Change from:
```tsx
className="border rounded-lg p-4 cursor-pointer hover:border-primary hover:bg-accent/50"
```
To:
```tsx
className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-lg p-4 cursor-pointer hover:shadow-lg hover:shadow-primary/25"
```

- [ ] **Step 4: Apply glassmorphism to form card (line ~289)**

Same glassmorphism wrapper pattern.

- [ ] **Step 5: Apply glassmorphism to task list card (line ~348)**

Same glassmorphism wrapper pattern.

- [ ] **Step 6: Update task items (line ~367)**

Change from:
```tsx
className="border rounded-lg p-4"
```
To:
```tsx
className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-4"
```

- [ ] **Step 7: Add motion imports and animations**

Add framer-motion with spring animations for entrance.

- [ ] **Step 8: Commit**

```bash
git add src/pages/VideoAgent.tsx
git commit -m "feat(ui): apply glassmorphism to VideoAgent page"
```

---

## Task 7: Final Verification and Integration

**Files:**
- Test all modified pages

- [ ] **Step 1: Verify TypeScript compiles**

```bash
npm run build
```
Expected: No type errors

- [ ] **Step 2: Verify all pages in browser**

Navigate to each page and check:
- `/media` - Filter buttons enlarged
- `/music` - Cards have glassmorphism, animations smooth
- `/video` - Cards have glassmorphism
- `/video-agent` - Cards have glassmorphism

- [ ] **Step 3: Test dark theme**

Toggle dark mode and verify glassmorphism effects work:
- backdrop-blur should work on dark backgrounds
- gradient glow should be visible
- shadows should be appropriate

- [ ] **Step 4: Create integration commit**

```bash
git add docs/specs/2026-04-15-ui-enhancement-design.md docs/plans/2026-04-15-ui-enhancement.md
git commit -m "docs: add UI enhancement design and implementation plan"
```

---

## Verification Checklist

After all tasks complete:

1. [ ] MediaManagement filter buttons: h-8, px-3, text-sm, w-4 icons
2. [ ] MusicTaskCard: gradient glow, backdrop-blur-xl, spring animations
3. [ ] MusicCarousel: glass container wrapper
4. [ ] MusicGeneration: all cards have glassmorphism
5. [ ] VideoGeneration: all cards have glassmorphism
6. [ ] VideoAgent: all cards have glassmorphism
7. [ ] Dark theme: all effects visible and appropriate
8. [ ] TypeScript build: passes
9. [ ] No ARIA attributes removed (accessibility preserved)