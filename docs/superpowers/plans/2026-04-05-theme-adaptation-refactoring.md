# Theme Adaptation Refactoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace ~500 hardcoded Tailwind color classes with theme-aware semantic tokens that respond to all 22 themes dynamically.

**Architecture:** Implement a three-layer token system (CSS variables → Semantic aliases → Component utilities) following SOLID principles. Add semantic status color variables to all 22 themes, create a new theme-aware token architecture that bridges CSS variables with Tailwind classes, migrate components in categorized waves.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, CSS Variables, HSL color format

**Category Recommendations:**
- **quick**: Wave 1 CSS variable additions, simple token mappings
- **visual-engineering**: Wave 2 token architecture, Tailwind config updates, component migration
- **deep**: Wave 3 utility functions, complex component refactors with edge cases

---

## Project Context

**Current State:**
- 22 themes (11 dark, 11 light) defined in `src/index.css`
- Tokens in `src/themes/tokens.ts` use hardcoded Tailwind classes (blue-500, green-600, etc.)
- ~500 hardcoded color instances across 83+ files need migration
- Status colors (success/warning/error/info) are NOT defined as CSS variables

**Root Problem:** `tokens.ts` exports static Tailwind strings that don't respond to theme changes.

**Solution Approach:**
1. Add semantic status color CSS variables to all 22 themes
2. Create new token utilities that reference CSS variables instead of static classes
3. Maintain backward compatibility during migration
4. Test theme switching across all affected components

---

## Phase 0: Pre-Flight Verification

### Task 0.1: Verify Build and Test Baseline

**Files:**
- Run in: project root

**Dependencies:** None

**Steps:**

- [ ] **Step 1: Verify current build passes**

Run: `npm run build`
Expected: Build completes with no errors

- [ ] **Step 2: Run existing tests**

Run: `vitest run --reporter=verbose`
Expected: All existing tests pass

- [ ] **Step 3: Document current hardcoded color usage**

Run: `grep -r "bg-\(blue\|green\|red\|yellow\|purple\|gray\|white\|black\)-" src --include="*.tsx" | wc -l`
Expected: Count baseline (should be ~103 matches per grep output)

Save output to: `docs/superpowers/plans/baseline-color-usage.txt`

---

## Wave 1: Add Semantic Status Color CSS Variables

**Parallelizable:** Yes - all theme definitions in `src/index.css` can be updated independently
**Estimated Duration:** 2-3 hours
**Agent Category:** quick

### Task 1.1: Design Status Color Palette for Dark Themes

**Files:**
- Create: `docs/superpowers/plans/status-colors-design.md` (reference doc)

**Dependencies:** None

**Design Decisions:**

For dark themes, status colors need sufficient contrast against dark backgrounds:

| Status | Dark Theme Formula | Example (Midnight) |
|--------|-------------------|-------------------|
| success | Green family, high lightness | 142 71% 45% |
| warning | Yellow/Amber, high lightness | 38 92% 50% |
| error | Red, high lightness | 0 84% 60% |
| info | Blue (match primary tint) | 217 91% 60% |

- [ ] **Step 1: Document color values for all dark themes**

Create `docs/superpowers/plans/status-colors-design.md`:

```markdown
# Status Colors Design

## Dark Themes

### Midnight
- --success: 142 71% 45%
- --success-foreground: 220 20% 6%
- --warning: 38 92% 50%
- --warning-foreground: 220 20% 6%
- --error: 0 84% 60%
- --error-foreground: 220 20% 6%
- --info: 217 91% 60%
- --info-foreground: 220 20% 6%

### Ocean Blue
[Continue for each dark theme...]
```

- [ ] **Step 2: Design light theme variants**

For light themes, darken the colors:
- --success: 142 76% 36% (darker for light bg)
- --warning: 38 92% 40%
- --error: 0 84% 50%
- --info: 217 91% 50%

---

### Task 1.2: Add Status Colors to Root CSS Variables

**Files:**
- Modify: `src/index.css:6-44` (root variables)

**Dependencies:** Task 1.1

**Before:**
```css
:root {
  --background: 220 20% 6%;
  --foreground: 210 40% 98%;
  /* ... existing vars ... */
  --destructive: 0 62% 50%;
  --destructive-foreground: 210 40% 98%;
  --border: 220 15% 20%;
  /* no status colors */
}
```

**After:**
```css
:root {
  --background: 220 20% 6%;
  --foreground: 210 40% 98%;
  /* ... existing vars ... */
  --destructive: 0 62% 50%;
  --destructive-foreground: 210 40% 98%;
  
  /* Semantic Status Colors */
  --success: 142 71% 45%;
  --success-foreground: 220 20% 6%;
  --warning: 38 92% 50%;
  --warning-foreground: 220 20% 6%;
  --error: 0 84% 60%;
  --error-foreground: 220 20% 6%;
  --info: 217 91% 60%;
  --info-foreground: 220 20% 6%;
  
  --border: 220 15% 20%;
  /* ... rest of vars */
}
```

- [ ] **Step 1: Add status colors to :root**

Edit `src/index.css` lines 22-26 (after --destructive-foreground)

- [ ] **Step 2: Verify CSS is valid**

Run: No command needed - visual inspection of CSS syntax

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat(themes): add semantic status color CSS variables to root

Add --success, --warning, --error, --info with foreground variants
Following shadcn/ui semantic token pattern with -foreground suffix"
```

---

### Task 1.3: Add Status Colors to Dark Theme Classes

**Files:**
- Modify: `src/index.css:61-94` (.theme-midnight)
- Modify: `src/index.css:96-130` (.theme-ocean-blue)
- Modify: `src/index.css:132-166` (.theme-dracula)
- Modify: `src/index.css:168-202` (.theme-nord)
- Modify: `src/index.css:204-238` (.theme-monokai)
- Modify: `src/index.css:240-274` (.theme-solarized-dark)
- Modify: `src/index.css:276-310` (.theme-github-dark)
- Modify: `src/index.css:312-346` (.theme-one-dark)
- Modify: `src/index.css:348-382` (.theme-tokyo-night)
- Modify: `src/index.css:384-418` (.theme-purple-haze)
- Modify: `src/index.css:420-454` (.theme-cyberpunk)

**Dependencies:** Task 1.2

**Pattern:** Add after --destructive-foreground in each theme:

```css
/* For each dark theme class */
.theme-midnight {
  /* ... existing vars ... */
  --destructive-foreground: 210 40% 98%;
  
  /* Status colors */
  --success: 142 71% 45%;
  --success-foreground: 220 20% 6%;
  --warning: 38 92% 50%;
  --warning-foreground: 220 20% 6%;
  --error: 0 84% 60%;
  --error-foreground: 220 20% 6%;
  --info: 217 91% 60%;
  --info-foreground: 220 20% 6%;
  
  --border: 220 15% 20%;
  /* ... */
}
```

- [ ] **Step 1: Add status colors to .theme-midnight**

Edit lines 76-80 (after --destructive-foreground)

- [ ] **Step 2: Add status colors to .theme-ocean-blue**

Adjust values to match theme's aesthetic (bluer tints)

- [ ] **Step 3: Add status colors to .theme-dracula**

Continue pattern for all 11 dark themes

- [ ] **Step 4: Commit dark themes**

```bash
git add src/index.css
git commit -m "feat(themes): add status colors to all dark themes

- Updated 11 dark theme classes
- Each theme has theme-appropriate status color tints
- Maintains WCAG AA contrast ratios"
```

---

### Task 1.4: Add Status Colors to Light Theme Classes

**Files:**
- Modify: `src/index.css` (light theme sections - approximately lines 456-850)

**Dependencies:** Task 1.3

**Pattern:** For light themes, status colors are darker:

```css
.theme-classic-light {
  /* ... existing vars ... */
  --destructive-foreground: 0 0% 100%;
  
  /* Status colors - darker for light backgrounds */
  --success: 142 76% 36%;
  --success-foreground: 0 0% 100%;
  --warning: 38 92% 40%;
  --warning-foreground: 0 0% 100%;
  --error: 0 84% 50%;
  --error-foreground: 0 0% 100%;
  --info: 217 91% 50%;
  --info-foreground: 0 0% 100%;
  
  --border: 220 13% 88%;
  /* ... */
}
```

- [ ] **Step 1: Add status colors to .theme-classic-light**

- [ ] **Step 2: Add status colors to remaining 10 light themes**

- [ ] **Step 3: Verify all 22 themes have status colors**

Run: `grep -c "--success:" src/index.css`
Expected: 22 (1 root + 21 themes)

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "feat(themes): add status colors to all light themes

- Updated 11 light theme classes with darker status colors
- Maintains contrast on light backgrounds
- Complete 22-theme coverage for status colors"
```

---

### Task 1.5: Update Tailwind Config with Status Colors

**Files:**
- Modify: `tailwind.config.js`

**Dependencies:** Task 1.4

**Before:**
```javascript
colors: {
  border: "hsl(var(--border))",
  input: "hsl(var(--input))",
  // ... existing ...
  card: {
    DEFAULT: "hsl(var(--card))",
    foreground: "hsl(var(--card-foreground))",
  },
  dark: { /* ... */ },
},
```

**After:**
```javascript
colors: {
  border: "hsl(var(--border))",
  input: "hsl(var(--input))",
  // ... existing ...
  card: {
    DEFAULT: "hsl(var(--card))",
    foreground: "hsl(var(--card-foreground))",
  },
  dark: { /* ... */ },
  // Semantic Status Colors
  success: {
    DEFAULT: "hsl(var(--success))",
    foreground: "hsl(var(--success-foreground))",
  },
  warning: {
    DEFAULT: "hsl(var(--warning))",
    foreground: "hsl(var(--warning-foreground))",
  },
  error: {
    DEFAULT: "hsl(var(--error))",
    foreground: "hsl(var(--error-foreground))",
  },
  info: {
    DEFAULT: "hsl(var(--info))",
    foreground: "hsl(var(--info-foreground))",
  },
},
```

- [ ] **Step 1: Add status colors to tailwind.config.js**

Add after the `dark` color scale (around line 56)

- [ ] **Step 2: Verify Tailwind config syntax**

Run: `npx tailwindcss config --help` or simply build
Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Test status color classes work**

Create temporary test in any component:
```tsx
<div className="bg-success text-success-foreground">Test</div>
```
Verify it renders with correct colors

- [ ] **Step 4: Commit**

```bash
git add tailwind.config.js
git commit -m "feat(themes): add semantic status colors to Tailwind config

- success, warning, error, info with foreground variants
- Enables utility classes: bg-success, text-success-foreground, etc."
```

---

## Wave 2: Create Theme-Aware Token Architecture

**Parallelizable:** Partially - token files can be created in parallel, but tests depend on implementation
**Estimated Duration:** 3-4 hours
**Agent Category:** visual-engineering

### Task 2.1: Create Semantic Token Type Definitions

**Files:**
- Create: `src/themes/tokens/semantic.ts`

**Dependencies:** Task 1.5

**Design:** Define TypeScript interfaces for semantic tokens that map to CSS variables.

- [ ] **Step 1: Create semantic token types**

Create `src/themes/tokens/semantic.ts`:

```typescript
/**
 * Semantic Design Tokens
 * 
 * These tokens reference CSS variables and respond to theme changes.
 * Use these instead of hardcoded Tailwind classes for theme-aware styling.
 */

// ============================================================================
// Status Token Types
// ============================================================================

export interface StatusTokenSet {
  /** Background color - bg-* utility */
  bg: string
  /** Light background with opacity - bg-*/10 */
  bgSubtle: string
  /** Text color - text-* */
  text: string
  /** Border color - border-* */
  border: string
  /** Icon color */
  icon: string
  /** Foreground for colored backgrounds */
  foreground: string
}

export type StatusType = 'success' | 'warning' | 'error' | 'info' | 'pending'

// ============================================================================
// Service Token Types
// ============================================================================

export interface ServiceTokenSet {
  /** Background with opacity */
  bg: string
  /** Text color */
  text: string
  /** Icon color */
  icon: string
}

export type ServiceType = 'text' | 'voice' | 'image' | 'music' | 'video' | 'cron' | 'workflow'

// ============================================================================
// Role Token Types
// ============================================================================

export interface RoleTokenSet {
  /** Gradient classes */
  gradient: string
  /** Solid background */
  bg: string
  /** Light background with opacity */
  bgLight: string
  /** Text color */
  text: string
  /** Border color */
  border: string
}

export type RoleType = 'super' | 'admin' | 'pro' | 'user'

// ============================================================================
// Task Status Token Types
// ============================================================================

export interface TaskStatusTokenSet {
  bg: string
  text: string
  border: string
  dot: string
}

export type TaskStatusType = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
```

- [ ] **Step 2: Commit type definitions**

```bash
git add src/themes/tokens/semantic.ts
git commit -m "feat(themes): add semantic token type definitions

- StatusTokenSet, ServiceTokenSet, RoleTokenSet, TaskStatusTokenSet
- Type-safe foundation for theme-aware tokens"
```

---

### Task 2.2: Create CSS Variable-Based Token Values

**Files:**
- Create: `src/themes/tokens/values.ts`

**Dependencies:** Task 2.1

**Design:** Token values that use CSS variable-based Tailwind classes.

- [ ] **Step 1: Create token values using CSS variables**

Create `src/themes/tokens/values.ts`:

```typescript
/**
 * Theme-Aware Token Values
 * 
 * These use Tailwind classes that reference CSS variables.
 * They automatically adapt to the current theme.
 */

import type {
  StatusTokenSet,
  ServiceTokenSet,
  RoleTokenSet,
  TaskStatusTokenSet,
  StatusType,
  ServiceType,
  RoleType,
  TaskStatusType,
} from './semantic'

// ============================================================================
// Status Tokens (Theme-Aware)
// ============================================================================

export const status: Record<StatusType, StatusTokenSet> = {
  success: {
    bg: 'bg-success',
    bgSubtle: 'bg-success/10',
    text: 'text-success',
    border: 'border-success/20',
    icon: 'text-success',
    foreground: 'text-success-foreground',
  },
  warning: {
    bg: 'bg-warning',
    bgSubtle: 'bg-warning/10',
    text: 'text-warning',
    border: 'border-warning/20',
    icon: 'text-warning',
    foreground: 'text-warning-foreground',
  },
  error: {
    bg: 'bg-error',
    bgSubtle: 'bg-error/10',
    text: 'text-error',
    border: 'border-error/20',
    icon: 'text-error',
    foreground: 'text-error-foreground',
  },
  info: {
    bg: 'bg-info',
    bgSubtle: 'bg-info/10',
    text: 'text-info',
    border: 'border-info/20',
    icon: 'text-info',
    foreground: 'text-info-foreground',
  },
  pending: {
    bg: 'bg-muted-foreground',
    bgSubtle: 'bg-muted-foreground/10',
    text: 'text-muted-foreground',
    border: 'border-muted-foreground/20',
    icon: 'text-muted-foreground',
    foreground: 'text-foreground',
  },
}

// ============================================================================
// Task Status Tokens (Theme-Aware)
// ============================================================================

export const taskStatus: Record<TaskStatusType, TaskStatusTokenSet> = {
  pending: {
    bg: 'bg-muted-foreground/10',
    text: 'text-muted-foreground',
    border: 'border-muted-foreground/20',
    dot: 'bg-muted-foreground',
  },
  running: {
    bg: 'bg-info/10',
    text: 'text-info',
    border: 'border-info/20',
    dot: 'bg-info',
  },
  completed: {
    bg: 'bg-success/10',
    text: 'text-success',
    border: 'border-success/20',
    dot: 'bg-success',
  },
  failed: {
    bg: 'bg-error/10',
    text: 'text-error',
    border: 'border-error/20',
    dot: 'bg-error',
  },
  cancelled: {
    bg: 'bg-warning/10',
    text: 'text-warning',
    border: 'border-warning/20',
    dot: 'bg-warning',
  },
}

// ============================================================================
// Service Tokens (Theme-Aware via Primary Scale)
// ============================================================================

export const services: Record<ServiceType, ServiceTokenSet> = {
  text: {
    bg: 'bg-primary/10',
    text: 'text-primary',
    icon: 'text-primary',
  },
  voice: {
    bg: 'bg-secondary/10',
    text: 'text-secondary-foreground',
    icon: 'text-secondary-foreground',
  },
  image: {
    bg: 'bg-accent/10',
    text: 'text-accent-foreground',
    icon: 'text-accent-foreground',
  },
  music: {
    bg: 'bg-primary-400/10',
    text: 'text-primary-400',
    icon: 'text-primary-400',
  },
  video: {
    bg: 'bg-destructive/10',
    text: 'text-destructive',
    icon: 'text-destructive',
  },
  cron: {
    bg: 'bg-muted/10',
    text: 'text-muted-foreground',
    icon: 'text-muted-foreground',
  },
  workflow: {
    bg: 'bg-primary-600/10',
    text: 'text-primary-600',
    icon: 'text-primary-600',
  },
}

// ============================================================================
// Role Tokens (Theme-Aware via Primary/Destructive)
// ============================================================================

export const roles: Record<RoleType, RoleTokenSet> = {
  super: {
    gradient: 'from-warning to-error',
    bg: 'bg-warning',
    bgLight: 'bg-warning/10',
    text: 'text-warning',
    border: 'border-warning/20',
  },
  admin: {
    gradient: 'from-primary to-info',
    bg: 'bg-primary',
    bgLight: 'bg-primary/10',
    text: 'text-primary',
    border: 'border-primary/20',
  },
  pro: {
    gradient: 'from-secondary to-accent',
    bg: 'bg-secondary',
    bgLight: 'bg-secondary/10',
    text: 'text-secondary-foreground',
    border: 'border-secondary/20',
  },
  user: {
    gradient: 'from-success to-info',
    bg: 'bg-success',
    bgLight: 'bg-success/10',
    text: 'text-success',
    border: 'border-success/20',
  },
}
```

- [ ] **Step 2: Commit token values**

```bash
git add src/themes/tokens/values.ts
git commit -m "feat(themes): add theme-aware token values

- status, taskStatus, services, roles using CSS variable classes
- Replaces hardcoded blue-500, green-600 with bg-primary, bg-success, etc."
```

---

### Task 2.3: Create Token Utility Functions

**Files:**
- Create: `src/themes/tokens/utils.ts`

**Dependencies:** Task 2.2

**Design:** Helper functions for accessing tokens with type safety.

- [ ] **Step 1: Create utility functions**

Create `src/themes/tokens/utils.ts`:

```typescript
/**
 * Token Utility Functions
 * 
 * Type-safe accessors for semantic tokens.
 */

import { cn } from '@/lib/utils'
import { status, taskStatus, services, roles } from './values'
import type {
  StatusType,
  TaskStatusType,
  ServiceType,
  RoleType,
  StatusTokenSet,
  TaskStatusTokenSet,
  ServiceTokenSet,
  RoleTokenSet,
} from './semantic'

// ============================================================================
// Status Token Helpers
// ============================================================================

export function getStatusTokens(statusKey: StatusType): StatusTokenSet {
  return status[statusKey]
}

export function getStatusClasses(
  statusKey: StatusType,
  options: {
    bg?: boolean
    text?: boolean
    border?: boolean
    icon?: boolean
  } = {}
): string {
  const tokens = status[statusKey]
  return cn(
    options.bg && tokens.bg,
    options.text && tokens.text,
    options.border && tokens.border,
    options.icon && tokens.icon
  )
}

// ============================================================================
// Task Status Token Helpers
// ============================================================================

export function getTaskStatusTokens(statusKey: TaskStatusType): TaskStatusTokenSet {
  return taskStatus[statusKey]
}

// ============================================================================
// Service Token Helpers
// ============================================================================

export function getServiceTokens(serviceKey: ServiceType): ServiceTokenSet {
  return services[serviceKey]
}

// ============================================================================
// Role Token Helpers
// ============================================================================

export function getRoleTokens(roleKey: RoleType): RoleTokenSet {
  return roles[roleKey]
}

// ============================================================================
// Legacy Compatibility Helpers
// ============================================================================

/**
 * @deprecated Use getStatusTokens() instead. Kept for backward compatibility during migration.
 */
export function getStatusColors(statusKey: StatusType): StatusTokenSet {
  return getStatusTokens(statusKey)
}

/**
 * @deprecated Use getRoleTokens() instead. Kept for backward compatibility during migration.
 */
export function getRoleColors(roleKey: RoleType): RoleTokenSet {
  return getRoleTokens(roleKey)
}
```

- [ ] **Step 2: Commit utility functions**

```bash
git add src/themes/tokens/utils.ts
git commit -m "feat(themes): add token utility functions

- getStatusTokens, getTaskStatusTokens, getServiceTokens, getRoleTokens
- Legacy compatibility wrappers for gradual migration"
```

---

### Task 2.4: Create Token Index Export

**Files:**
- Create: `src/themes/tokens/index.ts`
- Modify: `src/themes/index.ts` (add new exports)

**Dependencies:** Task 2.3

- [ ] **Step 1: Create tokens index**

Create `src/themes/tokens/index.ts`:

```typescript
/**
 * Theme Tokens
 * 
 * Semantic, theme-aware tokens that respond to CSS variable changes.
 * 
 * @example
 * ```tsx
 * import { status, getStatusTokens } from '@/themes/tokens'
 * 
 * // Use token object directly
 * <div className={status.success.bg}>Success</div>
 * 
 * // Use helper function
 * const tokens = getStatusTokens('success')
 * <div className={tokens.bg}>Success</div>
 * ```
 */

// Types
export type {
  StatusTokenSet,
  ServiceTokenSet,
  RoleTokenSet,
  TaskStatusTokenSet,
  StatusType,
  ServiceType,
  RoleType,
  TaskStatusType,
} from './semantic'

// Token values
export { status, taskStatus, services, roles } from './values'

// Utilities
export {
  getStatusTokens,
  getStatusClasses,
  getTaskStatusTokens,
  getServiceTokens,
  getRoleTokens,
  // Legacy compatibility
  getStatusColors,
  getRoleColors,
} from './utils'
```

- [ ] **Step 2: Update themes index**

Modify `src/themes/index.ts` to export new tokens:

```typescript
/**
 * Theme System
 */

// Registry
export { themeRegistry, getThemeMetadata, getActiveThemeId } from './registry'
export type { ThemeMetadata, ThemeCategory } from './registry'

// Legacy tokens (hardcoded - will be deprecated)
export * from './tokens'

// NEW: Semantic tokens (theme-aware)
export * from './tokens/index'
```

- [ ] **Step 3: Commit index files**

```bash
git add src/themes/tokens/index.ts src/themes/index.ts
git commit -m "feat(themes): export semantic tokens from theme module

- Centralized export from @/themes/tokens
- Maintains backward compatibility with legacy tokens"
```

---

### Task 2.5: Write Tests for Semantic Tokens

**Files:**
- Create: `src/themes/tokens/values.test.ts`

**Dependencies:** Task 2.4

- [ ] **Step 1: Create token tests**

Create `src/themes/tokens/values.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { status, taskStatus, services, roles } from './values'
import type { StatusType, TaskStatusType, ServiceType, RoleType } from './semantic'

describe('Semantic Tokens', () => {
  describe('status tokens', () => {
    const statusKeys: StatusType[] = ['success', 'warning', 'error', 'info', 'pending']
    
    statusKeys.forEach((key) => {
      it(`should have all required properties for ${key}`, () => {
        const token = status[key]
        expect(token.bg).toBeDefined()
        expect(token.bgSubtle).toBeDefined()
        expect(token.text).toBeDefined()
        expect(token.border).toBeDefined()
        expect(token.icon).toBeDefined()
        expect(token.foreground).toBeDefined()
      })
      
      it(`should use CSS variable classes for ${key}`, () => {
        const token = status[key]
        // Should use semantic class names, not hardcoded colors
        expect(token.bg).not.toMatch(/blue-|green-|red-|yellow-|purple-/)
        expect(token.bg).toMatch(/^bg-/)
      })
    })
  })
  
  describe('taskStatus tokens', () => {
    const taskKeys: TaskStatusType[] = ['pending', 'running', 'completed', 'failed', 'cancelled']
    
    taskKeys.forEach((key) => {
      it(`should have all required properties for ${key}`, () => {
        const token = taskStatus[key]
        expect(token.bg).toBeDefined()
        expect(token.text).toBeDefined()
        expect(token.border).toBeDefined()
        expect(token.dot).toBeDefined()
      })
    })
  })
  
  describe('services tokens', () => {
    const serviceKeys: ServiceType[] = ['text', 'voice', 'image', 'music', 'video', 'cron', 'workflow']
    
    serviceKeys.forEach((key) => {
      it(`should have all required properties for ${key}`, () => {
        const token = services[key]
        expect(token.bg).toBeDefined()
        expect(token.text).toBeDefined()
        expect(token.icon).toBeDefined()
      })
    })
  })
  
  describe('roles tokens', () => {
    const roleKeys: RoleType[] = ['super', 'admin', 'pro', 'user']
    
    roleKeys.forEach((key) => {
      it(`should have all required properties for ${key}`, () => {
        const token = roles[key]
        expect(token.gradient).toBeDefined()
        expect(token.bg).toBeDefined()
        expect(token.bgLight).toBeDefined()
        expect(token.text).toBeDefined()
        expect(token.border).toBeDefined()
      })
    })
  })
})
```

- [ ] **Step 2: Run tests**

Run: `vitest run src/themes/tokens/values.test.ts`
Expected: All tests pass

- [ ] **Step 3: Commit tests**

```bash
git add src/themes/tokens/values.test.ts
git commit -m "test(themes): add semantic token unit tests

- Validates all token sets have required properties
- Ensures no hardcoded color classes in semantic tokens"
```

---

## Wave 3: Component Migration

**Parallelizable:** Yes - components can be migrated in parallel by category
**Estimated Duration:** 6-8 hours
**Agent Category:** visual-engineering / deep (for complex components)

### Task 3.1: Create Migration Guide Document

**Files:**
- Create: `docs/superpowers/plans/theme-migration-guide.md`

**Dependencies:** Wave 2 complete

- [ ] **Step 1: Create migration patterns doc**

Create `docs/superpowers/plans/theme-migration-guide.md`:

```markdown
# Theme Migration Guide

## Common Patterns

### Pattern 1: Status Colors

**Before:**
```tsx
import { status } from '@/themes/tokens'
// or hardcoded:
<div className="bg-green-500 text-green-600">
```

**After:**
```tsx
import { status } from '@/themes/tokens'
<div className={status.success.bg}>
<div className={cn(status.success.bgSubtle, status.success.text)}>
```

### Pattern 2: Service Icons

**Before:**
```tsx
const colors: Record<ServiceType, string> = {
  text: 'text-blue-400 bg-blue-500/10',
  voice: 'text-green-400 bg-green-500/10',
}
```

**After:**
```tsx
import { services } from '@/themes/tokens'
<div className={cn(services.text.bg, services.text.text)}>
```

### Pattern 3: Role Badges

**Before:**
```tsx
import { roles } from '@/themes/tokens'
// Already using tokens, but old tokens are hardcoded
```

**After:**
```tsx
import { roles } from '@/themes/tokens'
// Same API, but tokens now use CSS variables
<div className={cn('bg-gradient-to-r', roles.admin.gradient)}>
```

## Component Categories

1. **Status badges** - StatusBadge.tsx, NodeStatusIndicator.tsx
2. **Service icons** - ServiceIcon.tsx
3. **Role badges** - User management components
4. **Task status** - Cron management, ExecutionLogPanel.tsx
```

- [ ] **Step 2: Commit guide**

```bash
git add docs/superpowers/plans/theme-migration-guide.md
git commit -m "docs(themes): add component migration patterns guide"
```

---

### Task 3.2: Migrate StatusBadge Component

**Files:**
- Modify: `src/components/ui/StatusBadge.tsx`

**Dependencies:** Task 3.1

**Before:** (Typical pattern)
```tsx
// Likely uses hardcoded classes or old tokens
const statusStyles = {
  success: 'bg-green-500/10 text-green-600 border-green-500/20',
  error: 'bg-red-500/10 text-red-600 border-red-500/20',
}
```

**After:**
```tsx
import { status } from '@/themes/tokens'

const statusStyles = {
  success: cn(status.success.bgSubtle, status.success.text, status.success.border),
  error: cn(status.error.bgSubtle, status.error.text, status.error.border),
  warning: cn(status.warning.bgSubtle, status.warning.text, status.warning.border),
  info: cn(status.info.bgSubtle, status.info.text, status.info.border),
}
```

- [ ] **Step 1: Read current StatusBadge implementation**

- [ ] **Step 2: Update to use semantic tokens**

- [ ] **Step 3: Test visually**

Switch themes and verify status badges adapt

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/StatusBadge.tsx
git commit -m "refactor(StatusBadge): use semantic theme tokens

- Replace hardcoded colors with theme-aware status tokens
- Colors now adapt to all 22 themes"
```

---

### Task 3.3: Migrate ServiceIcon Component

**Files:**
- Modify: `src/components/shared/ServiceIcon.tsx`

**Dependencies:** Task 3.2

**Before:**
```tsx
const colors: Record<ServiceType, string> = {
  text: 'text-primary-400 bg-primary-500/10',
  voice_sync: 'text-green-400 bg-green-500/10',
  image: 'text-purple-400 bg-purple-500/10',
  // ...
}
```

**After:**
```tsx
import { services } from '@/themes/tokens'

// services.text.icon, services.text.bg
// services.voice.icon, services.voice.bg
// etc.
```

- [ ] **Step 1: Read current ServiceIcon implementation**

- [ ] **Step 2: Map service types to new tokens**

Note: May need to adjust service type names or add mappings

- [ ] **Step 3: Update component**

- [ ] **Step 4: Test across themes**

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/ServiceIcon.tsx
git commit -m "refactor(ServiceIcon): use semantic service tokens

- Replace hardcoded service colors with theme-aware tokens
- Maintains icon styling while enabling theme adaptation"
```

---

### Task 3.4: Migrate Task Queue Components

**Files:**
- Modify: `src/components/cron/management/TaskQueueTab.tsx`
- Modify: `src/components/cron/nodes/LoopNode.tsx`

**Dependencies:** Task 3.3

**Pattern:** Use `taskStatus` tokens from `@/themes/tokens`

- [ ] **Step 1: Identify hardcoded status colors**

- [ ] **Step 2: Replace with taskStatus tokens**

```tsx
import { taskStatus } from '@/themes/tokens'

// Before: 'bg-blue-500/10 text-blue-600'
// After: cn(taskStatus.running.bg, taskStatus.running.text)
```

- [ ] **Step 3: Test task status displays**

- [ ] **Step 4: Commit**

```bash
git add src/components/cron/management/TaskQueueTab.tsx src/components/cron/nodes/LoopNode.tsx
git commit -m "refactor(cron): use semantic task status tokens

- Replace hardcoded status colors in task queue and loop node
- Task statuses now adapt to active theme"
```

---

### Task 3.5: Migrate Workflow Components

**Files:**
- Modify: `src/components/workflow/nodes/ActionNode.tsx`
- Modify: `src/components/workflow/NodeStatusIndicator.tsx`

**Dependencies:** Task 3.4

- [ ] **Step 1: Identify hardcoded colors in workflow nodes**

- [ ] **Step 2: Apply semantic tokens**

Use status tokens for:
- Error states
- Success states
- Validation errors
- Node type indicators

- [ ] **Step 3: Test workflow builder**

Verify colors work in:
- Light themes
- Dark themes
- All 22 theme variants

- [ ] **Step 4: Commit**

```bash
git add src/components/workflow/nodes/ActionNode.tsx src/components/workflow/NodeStatusIndicator.tsx
git commit -m "refactor(workflow): use semantic tokens for node styling

- ActionNode and NodeStatusIndicator use theme-aware colors
- Validation errors, status indicators adapt to theme"
```

---

### Task 3.6: Migrate Remaining Components

**Files:** (High priority from grep results)
- Modify: `src/pages/Dashboard.tsx`
- Modify: `src/pages/TokenMonitor.tsx`
- Modify: `src/components/workflow/TestRunPanel.tsx`
- Modify: `src/pages/CapacityMonitor.tsx`

**Dependencies:** Task 3.5

**Strategy:** Batch migration by grep results

- [ ] **Step 1: Review each component for hardcoded colors**

Use: `grep -n "bg-blue-\|bg-green-\|bg-red-\|text-blue-\|text-green-\|text-red-" <file>`

- [ ] **Step 2: Replace with appropriate semantic tokens**

Priority order:
1. Status indicators → `status.*` tokens
2. Service type displays → `services.*` tokens
3. Role displays → `roles.*` tokens
4. UI accents → `primary`, `secondary`, `accent` CSS vars
5. Backgrounds/surfaces → `background`, `card`, `muted` CSS vars

- [ ] **Step 3: Batch commit**

```bash
git add -A
git commit -m "refactor(components): migrate remaining components to semantic tokens

- Dashboard, TokenMonitor, TestRunPanel, CapacityMonitor
- Replaced hardcoded Tailwind colors with theme-aware tokens
- Components now adapt to all 22 themes"
```

---

## Wave 4: Cleanup and Deprecation

**Parallelizable:** No - must happen after Wave 3
**Estimated Duration:** 1-2 hours
**Agent Category:** quick

### Task 4.1: Deprecate Legacy tokens.ts

**Files:**
- Modify: `src/themes/tokens.ts`

**Dependencies:** All Wave 3 migrations complete

- [ ] **Step 1: Add deprecation notices**

Add to top of `src/themes/tokens.ts`:

```typescript
/**
 * Design Tokens System (LEGACY)
 * 
 * @deprecated These tokens use hardcoded Tailwind classes that don't respond to theme changes.
 * Use @/themes/tokens (semantic tokens) instead for theme-aware styling.
 * 
 * Migration:
 * - status, taskStatus, services, roles → import from @/themes/tokens
 * - primary, secondary, neutral colors → use CSS variable classes directly
 * - composite classes → replace with component-specific compositions
 */
```

- [ ] **Step 2: Mark exports as deprecated**

```typescript
/** @deprecated Use status from @/themes/tokens instead */
export const status = { ... }

/** @deprecated Use services from @/themes/tokens instead */
export const services = { ... }
```

- [ ] **Step 3: Commit deprecation**

```bash
git add src/themes/tokens.ts
git commit -m "chore(themes): deprecate legacy tokens.ts

- Added deprecation notices to all exports
- Directs consumers to new semantic tokens
- Maintains backward compatibility for gradual migration"
```

---

### Task 4.2: Update Exports Index

**Files:**
- Modify: `src/themes/index.ts`

**Dependencies:** Task 4.1

- [ ] **Step 1: Prioritize semantic token exports**

Update to clearly indicate preference:

```typescript
/**
 * Theme System
 * 
 * ## Semantic Tokens (Recommended)
 * Import: `import { status, services } from '@/themes/tokens'`
 * These use CSS variables and adapt to all themes.
 * 
 * ## Legacy Tokens (Deprecated)
 * Import: `import { status } from '@/themes'` (from tokens.ts)
 * These use hardcoded classes and DON'T adapt to themes.
 * @deprecated Migrate to semantic tokens
 */

export { themeRegistry, getThemeMetadata, getActiveThemeId } from './registry'
export type { ThemeMetadata, ThemeCategory } from './registry'

// Semantic tokens (theme-aware) - RECOMMENDED
export * from './tokens/index'

// Legacy tokens (hardcoded) - DEPRECATED
export * from './tokens'
```

- [ ] **Step 2: Commit**

```bash
git add src/themes/index.ts
git commit -m "docs(themes): clarify token export priorities in index

- Semantic tokens clearly marked as recommended
- Legacy tokens marked as deprecated
- Clear import guidance for developers"
```

---

## Wave 5: Testing and Validation

**Parallelizable:** Partially - visual tests and unit tests can run in parallel
**Estimated Duration:** 2-3 hours
**Agent Category:** deep

### Task 5.1: Create Theme Visual Regression Test

**Files:**
- Create: `src/themes/__tests__/theme-visual-regression.test.tsx`

**Dependencies:** All migrations complete

- [ ] **Step 1: Create visual regression test**

Create test that renders components in different themes:

```typescript
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ServiceIcon } from '@/components/shared/ServiceIcon'

describe('Theme Visual Regression', () => {
  const themes = ['midnight', 'classic-light', 'ocean-blue', 'github-light']
  
  themes.forEach((themeId) => {
    describe(`Theme: ${themeId}`, () => {
      beforeEach(() => {
        // Apply theme class to document
        document.documentElement.className = `theme-${themeId}`
      })
      
      it('StatusBadge renders without hardcoded colors', () => {
        const { container } = render(<StatusBadge status="success">Success</StatusBadge>)
        const badge = container.firstChild as HTMLElement
        
        // Should not contain hardcoded color classes
        const classNames = badge.className
        expect(classNames).not.toMatch(/green-|red-|blue-|yellow-/)
        
        // Should contain semantic classes
        expect(classNames).toMatch(/bg-|text-/)
      })
      
      it('ServiceIcon renders with theme-aware colors', () => {
        const { container } = render(<ServiceIcon service="text" />)
        const icon = container.firstChild as HTMLElement
        
        const classNames = icon.className
        expect(classNames).not.toMatch(/blue-|purple-|green-|pink-/)
      })
    })
  })
})
```

- [ ] **Step 2: Run visual regression tests**

Run: `vitest run src/themes/__tests__/theme-visual-regression.test.tsx`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add src/themes/__tests__/theme-visual-regression.test.tsx
git commit -m "test(themes): add visual regression tests for theme adaptation

- Tests components render without hardcoded colors
- Validates across multiple themes"
```

---

### Task 5.2: Create Hardcoded Color Detection Script

**Files:**
- Create: `scripts/detect-hardcoded-colors.js`

**Dependencies:** Task 5.1

- [ ] **Step 1: Create detection script**

```javascript
#!/usr/bin/env node
/**
 * Detect Hardcoded Colors
 * 
 * Scans the codebase for hardcoded Tailwind color classes
 * that should be replaced with semantic tokens.
 */

const fs = require('fs')
const path = require('path')
const { globSync } = require('glob')

const COLOR_PATTERNS = [
  /bg-(blue|green|red|yellow|purple|gray|white|black|pink|indigo|cyan|teal|orange|amber|emerald)-\d+/,  
  /text-(blue|green|red|yellow|purple|gray|white|black|pink|indigo|cyan|teal|orange|amber|emerald)-\d+/,
  /border-(blue|green|red|yellow|purple|gray|white|black|pink|indigo|cyan|teal|orange|amber|emerald)-\d+/,
]

const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.test\.(ts|tsx)$/,
  /__tests__/,
]

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const matches = []
  
  COLOR_PATTERNS.forEach((pattern) => {
    const lineMatches = content.split('\n').map((line, index) => {
      if (pattern.test(line)) {
        return { line: index + 1, text: line.trim() }
      }
      return null
    }).filter(Boolean)
    
    matches.push(...lineMatches)
  })
  
  return matches
}

function main() {
  const files = globSync('src/**/*.{ts,tsx}', {
    ignore: ['**/node_modules/**', '**/*.test.*', '**/__tests__/**'],
  })
  
  let totalMatches = 0
  const results = []
  
  files.forEach((file) => {
    const matches = scanFile(file)
    if (matches.length > 0) {
      totalMatches += matches.length
      results.push({ file, matches })
    }
  })
  
  console.log('\n=== Hardcoded Color Detection Results ===\n')
  console.log(`Files with hardcoded colors: ${results.length}`)
  console.log(`Total hardcoded color occurrences: ${totalMatches}`)
  console.log('\n---\n')
  
  results.forEach(({ file, matches }) => {
    console.log(`\n${file} (${matches.length} occurrences):`)
    matches.forEach((match) => {
      console.log(`  Line ${match.line}: ${match.text.substring(0, 80)}`)
    })
  })
  
  // Exit with error if hardcoded colors found
  if (totalMatches > 0) {
    console.log('\n\n⚠️  Hardcoded colors detected. Run this script with --fix to see suggestions.')
    process.exit(1)
  } else {
    console.log('\n\n✅ No hardcoded colors detected!')
    process.exit(0)
  }
}

main()
```

- [ ] **Step 2: Run detection script**

Run: `node scripts/detect-hardcoded-colors.js`
Expected: Should show remaining hardcoded colors or pass if all migrated

- [ ] **Step 3: Commit**

```bash
git add scripts/detect-hardcoded-colors.js
git commit -m "chore(themes): add hardcoded color detection script

- Scans codebase for hardcoded Tailwind color classes
- Can be added to CI to prevent regressions
- Reports files and line numbers for easy fixes"
```

---

### Task 5.3: Final Verification and Documentation

**Files:**
- Modify: `docs/superpowers/plans/2026-04-05-theme-adaptation-refactoring.md` (this file)

**Dependencies:** Task 5.2

- [ ] **Step 1: Update baseline metrics**

Run detection script and update:

```markdown
## Migration Results

| Metric | Before | After |
|--------|--------|-------|
| Hardcoded color instances | ~500 | [TBD] |
| Files with hardcoded colors | 83+ | [TBD] |
| Themes supported | 22 | 22 |
| Semantic token coverage | 0% | 100% |
```

- [ ] **Step 2: Run full test suite**

Run: `vitest run`
Expected: All tests pass

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Mark plan as complete**

Update this plan file header:

```markdown
# Theme Adaptation Refactoring Implementation Plan

**Status:** ✅ COMPLETE
**Completed:** [DATE]

## Summary
- [Brief summary of what was accomplished]
```

- [ ] **Step 5: Final commit**

```bash
git add docs/superpowers/plans/2026-04-05-theme-adaptation-refactoring.md
git commit -m "docs(themes): mark theme refactoring plan as complete

- All waves completed
- Migration results documented
- Detection script in place for CI"
```

---

## Appendix: Quick Reference

### Import Paths

```typescript
// NEW: Semantic tokens (theme-aware)
import { status, services, roles, taskStatus } from '@/themes/tokens'
import { getStatusTokens, getServiceTokens } from '@/themes/tokens'

// OLD: Legacy tokens (hardcoded) - DEPRECATED
import { status, services, roles } from '@/themes' // from tokens.ts
```

### Common Token Patterns

```typescript
// Status indicators
<div className={status.success.bg}>Success</div>
<div className={cn(status.error.bgSubtle, status.error.text)}>Error</div>

// Service icons
<div className={cn(services.text.bg, services.text.icon)}>
  <TextIcon />
</div>

// Task status
<div className={cn(taskStatus.running.bg, taskStatus.running.text)}>
  Running
</div>
```

### CSS Variable Classes

When tokens don't cover a use case, use CSS variables directly:

```tsx
// Background colors
<div className="bg-primary">Primary bg</div>
<div className="bg-secondary">Secondary bg</div>
<div className="bg-muted">Muted bg</div>
<div className="bg-accent">Accent bg</div>
<div className="bg-destructive">Destructive bg</div>

// Status (new)
<div className="bg-success">Success bg</div>
<div className="bg-warning">Warning bg</div>
<div className="bg-error">Error bg</div>
<div className="bg-info">Info bg</div>

// Dark scale
<div className="bg-dark-800">Dark surface</div>
<div className="text-dark-300">Muted text</div>
```

---

## Rollback Plan

If critical issues arise:

1. **Revert to previous commit:**
   ```bash
   git revert --no-commit HEAD~[N]..HEAD
   ```

2. **Restore legacy tokens.ts:**
   - Remove deprecation notices
   - Keep both old and new exports

3. **Gradual rollback:**
   - Revert component migrations one at a time
   - Keep CSS variable infrastructure
   - Switch components back to legacy tokens

---

## Testing Checklist

- [ ] All 22 themes display correctly
- [ ] Status badges (success/error/warning/info) adapt to all themes
- [ ] Service icons adapt to all themes
- [ ] Task status indicators adapt to all themes
- [ ] No console errors during theme switching
- [ ] Build completes without errors
- [ ] All unit tests pass
- [ ] Visual regression tests pass
- [ ] Hardcoded color detection script passes

---

*This plan was generated for theme adaptation refactoring. Follow each task in order within each wave, but waves can be executed in parallel by different agents.*
