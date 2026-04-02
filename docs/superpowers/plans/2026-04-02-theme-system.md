# Theme System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a complete theme system with 22 pre-configured themes (11 dark + 11 light) accessible via a settings modal from the sidebar.

**Architecture:** CSS classes approach - each theme defined as `.theme-{id}` class in `index.css` with ~30 CSS variables. TypeScript registry provides metadata for UI. Zustand store persists theme selection. React hook applies theme class to `<html>` element.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Zustand, CSS Variables

---

## File Structure

**New Files:**
| File | Purpose |
|------|---------|
| `src/themes/registry.ts` | Theme metadata, helper functions, THEME_REGISTRY array |
| `src/themes/index.ts` | Barrel export |
| `src/hooks/useThemeEffect.ts` | React hook to apply theme class to `<html>` |
| `src/components/settings/SettingsModal.tsx` | Modal with backdrop blur, theme picker section |
| `src/components/settings/ThemePicker.tsx` | Tabs + theme grid (System/Dark/Light) |
| `src/components/settings/ThemeCard.tsx` | Individual theme preview card |
| `src/components/settings/SystemOption.tsx` | "Follow system preference" option button |
| `src/components/settings/index.ts` | Barrel export |
| `src/themes/registry.test.ts` | Unit tests for registry helpers |
| `src/hooks/useThemeEffect.test.ts` | Unit tests for hook (with mocks) |

**Modified Files:**
| File | Changes |
|------|---------|
| `src/index.css` | Add 22 `.theme-{id}` CSS classes (~600 lines) |
| `src/stores/app.ts` | Change theme type, add helper functions |
| `src/components/layout/Sidebar.tsx` | Add Settings icon, SettingsModal state |
| `src/App.tsx` | Call `useThemeEffect()` at top level |

---

## Task 1: Theme Registry TypeScript Definition

**Files:**
- Create: `src/themes/registry.ts`
- Create: `src/themes/index.ts`
- Test: `src/themes/registry.test.ts`

- [ ] **Step 1: Write the failing test for getThemeById**

Create `src/themes/registry.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { getThemeById, getThemesByCategory, getDefaultThemeForCategory, THEME_REGISTRY } from './registry'
import type { ThemeCategory } from './registry'

describe('registry', () => {
  describe('getThemeById', () => {
    it('returns theme when id exists', () => {
      const theme = getThemeById('midnight')
      expect(theme).toBeDefined()
      expect(theme?.id).toBe('midnight')
      expect(theme?.name).toBe('Midnight')
      expect(theme?.category).toBe('dark')
    })

    it('returns undefined when id does not exist', () => {
      const theme = getThemeById('nonexistent-theme')
      expect(theme).toBeUndefined()
    })
  })

  describe('getThemesByCategory', () => {
    it('returns all dark themes', () => {
      const darkThemes = getThemesByCategory('dark')
      expect(darkThemes.length).toBe(11)
      expect(darkThemes.every(t => t.category === 'dark')).toBe(true)
    })

    it('returns all light themes', () => {
      const lightThemes = getThemesByCategory('light')
      expect(lightThemes.length).toBe(11)
      expect(lightThemes.every(t => t.category === 'light')).toBe(true)
    })
  })

  describe('getDefaultThemeForCategory', () => {
    it('returns midnight as default dark theme', () => {
      const theme = getDefaultThemeForCategory('dark')
      expect(theme.id).toBe('midnight')
    })

    it('returns classic-light as default light theme', () => {
      const theme = getDefaultThemeForCategory('light')
      expect(theme.id).toBe('classic-light')
    })
  })

  describe('THEME_REGISTRY', () => {
    it('contains exactly 22 themes', () => {
      expect(THEME_REGISTRY.length).toBe(22)
    })

    it('has unique ids for all themes', () => {
      const ids = THEME_REGISTRY.map(t => t.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(22)
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `vitest run src/themes/registry.test.ts`
Expected: FAIL - "Cannot find module './registry'"

- [ ] **Step 3: Write minimal implementation - types and registry**

Create `src/themes/registry.ts`:

```typescript
export type ThemeCategory = 'light' | 'dark'

export interface ThemeMeta {
  id: string
  name: string
  category: ThemeCategory
  preview: {
    background: string  // HSL format: "H S% L%"
    primary: string     // HSL format: "H S% L%"
  }
}

export const THEME_REGISTRY: ThemeMeta[] = [
  // Dark themes (11)
  { id: 'midnight', name: 'Midnight', category: 'dark',
    preview: { background: '220 20% 6%', primary: '217 91% 60%' } },
  { id: 'ocean-blue', name: 'Ocean Blue', category: 'dark',
    preview: { background: '210 50% 8%', primary: '200 100% 50%' } },
  { id: 'dracula', name: 'Dracula', category: 'dark',
    preview: { background: '231 15% 18%', primary: '326 100% 74%' } },
  { id: 'nord', name: 'Nord', category: 'dark',
    preview: { background: '220 17% 17%', primary: '194 100% 43%' } },
  { id: 'monokai', name: 'Monokai', category: 'dark',
    preview: { background: '240 20% 10%', primary: '60 100% 50%' } },
  { id: 'solarized-dark', name: 'Solarized Dark', category: 'dark',
    preview: { background: '193 100% 7%', primary: '45 100% 71%' } },
  { id: 'github-dark', name: 'GitHub Dark', category: 'dark',
    preview: { background: '210 10% 8%', primary: '203 100% 32%' } },
  { id: 'one-dark', name: 'One Dark', category: 'dark',
    preview: { background: '220 13% 15%', primary: '142 100% 48%' } },
  { id: 'tokyo-night', name: 'Tokyo Night', category: 'dark',
    preview: { background: '240 15% 8%', primary: '355 85% 60%' } },
  { id: 'purple-haze', name: 'Purple Haze', category: 'dark',
    preview: { background: '270 20% 10%', primary: '280 100% 60%' } },
  { id: 'cyberpunk', name: 'Cyberpunk', category: 'dark',
    preview: { background: '280 20% 8%', primary: '320 100% 50%' } },
  
  // Light themes (11)
  { id: 'classic-light', name: 'Classic Light', category: 'light',
    preview: { background: '0 0% 100%', primary: '0 0% 0%' } },
  { id: 'github-light', name: 'GitHub Light', category: 'light',
    preview: { background: '210 20% 98%', primary: '203 100% 32%' } },
  { id: 'solarized-light', name: 'Solarized Light', category: 'light',
    preview: { background: '44 87% 94%', primary: '45 100% 71%' } },
  { id: 'notion-light', name: 'Notion Light', category: 'light',
    preview: { background: '0 0% 100%', primary: '217 91% 60%' } },
  { id: 'material-light', name: 'Material Light', category: 'light',
    preview: { background: '210 40% 98%', primary: '217 91% 60%' } },
  { id: 'paper-white', name: 'Paper White', category: 'light',
    preview: { background: '40 30% 98%', primary: '200 50% 50%' } },
  { id: 'warm-light', name: 'Warm Light', category: 'light',
    preview: { background: '30 50% 95%', primary: '217 91% 60%' } },
  { id: 'cool-light', name: 'Cool Light', category: 'light',
    preview: { background: '210 30% 96%', primary: '195 100% 45%' } },
  { id: 'rose-light', name: 'Rose Light', category: 'light',
    preview: { background: '340 30% 96%', primary: '340 80% 50%' } },
  { id: 'mint-light', name: 'Mint Light', category: 'light',
    preview: { background: '150 30% 96%', primary: '150 100% 35%' } },
  { id: 'cream-light', name: 'Cream Light', category: 'light',
    preview: { background: '30 20% 96%', primary: '30 80% 40%' } },
]

export function getThemeById(id: string): ThemeMeta | undefined {
  return THEME_REGISTRY.find(t => t.id === id)
}

export function getThemesByCategory(category: ThemeCategory): ThemeMeta[] {
  return THEME_REGISTRY.filter(t => t.category === category)
}

export function getDefaultThemeForCategory(category: ThemeCategory): ThemeMeta {
  const defaultId = category === 'dark' ? 'midnight' : 'classic-light'
  return THEME_REGISTRY.find(t => t.id === defaultId)!
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `vitest run src/themes/registry.test.ts`
Expected: PASS - all 4 describe blocks pass

- [ ] **Step 5: Create barrel export**

Create `src/themes/index.ts`:

```typescript
export {
  THEME_REGISTRY,
  getThemeById,
  getThemesByCategory,
  getDefaultThemeForCategory,
} from './registry'
export type { ThemeMeta, ThemeCategory } from './registry'
```

- [ ] **Step 6: Commit registry**

```bash
git add src/themes/
git commit -m "feat(themes): add theme registry with 22 pre-configured themes"
```

---

## Task 2: CSS Theme Classes (22 themes)

**Files:**
- Modify: `src/index.css`

This task adds ~600 lines of CSS. Each theme class defines ~30 CSS variables.

- [ ] **Step 1: Read current index.css to understand structure**

Run: `cat src/index.css`

Note: File has `@tailwind` directives, `@layer base` for root variables, and `@layer utilities`.

- [ ] **Step 2: Add all 22 theme CSS classes after the existing `:root` block**

Modify `src/index.css` - add after line 44 (after the existing `:root` block closes):

```css
/* === Theme Classes === */
/* Each theme overrides CSS variables defined in :root */

/* === DARK THEMES (11) === */

/* Midnight - Default dark theme, matches existing :root colors */
.theme-midnight {
  --background: 220 20% 6%;
  --foreground: 210 40% 98%;
  --card: 220 20% 8%;
  --card-foreground: 210 40% 98%;
  --popover: 220 20% 8%;
  --popover-foreground: 210 40% 98%;
  --primary: 217 91% 60%;
  --primary-foreground: 220 20% 6%;
  --secondary: 220 15% 15%;
  --secondary-foreground: 210 40% 98%;
  --muted: 220 15% 15%;
  --muted-foreground: 215 20% 55%;
  --accent: 220 15% 15%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 62% 50%;
  --destructive-foreground: 210 40% 98%;
  --border: 220 15% 20%;
  --input: 220 15% 20%;
  --ring: 217 91% 60%;
  --radius: 0.5rem;
  --dark-950: 220 20% 6%;
  --dark-900: 220 18% 10%;
  --dark-800: 220 15% 15%;
  --dark-700: 220 12% 22%;
  --dark-600: 220 10% 30%;
  --dark-500: 220 8% 40%;
  --dark-400: 220 6% 50%;
  --dark-300: 220 4% 60%;
  --dark-200: 220 2% 75%;
  --primary-400: 217 91% 65%;
  --primary-500: 217 91% 60%;
  --primary-600: 217 91% 50%;
}

/* Ocean Blue */
.theme-ocean-blue {
  --background: 210 50% 8%;
  --foreground: 200 80% 95%;
  --card: 210 50% 10%;
  --card-foreground: 200 80% 95%;
  --popover: 210 50% 10%;
  --popover-foreground: 200 80% 95%;
  --primary: 200 100% 50%;
  --primary-foreground: 210 50% 8%;
  --secondary: 210 40% 18%;
  --secondary-foreground: 200 80% 95%;
  --muted: 210 40% 18%;
  --muted-foreground: 210 30% 50%;
  --accent: 210 40% 18%;
  --accent-foreground: 200 80% 95%;
  --destructive: 0 62% 50%;
  --destructive-foreground: 200 80% 95%;
  --border: 210 40% 25%;
  --input: 210 40% 25%;
  --ring: 200 100% 50%;
  --radius: 0.5rem;
  --dark-950: 210 50% 8%;
  --dark-900: 210 50% 10%;
  --dark-800: 210 40% 18%;
  --dark-700: 210 35% 25%;
  --dark-600: 210 30% 35%;
  --dark-500: 210 25% 45%;
  --dark-400: 210 20% 55%;
  --dark-300: 210 15% 65%;
  --dark-200: 210 10% 80%;
  --primary-400: 200 100% 55%;
  --primary-500: 200 100% 50%;
  --primary-600: 200 100% 45%;
}

/* Dracula */
.theme-dracula {
  --background: 231 15% 18%;
  --foreground: 60 30% 96%;
  --card: 231 15% 20%;
  --card-foreground: 60 30% 96%;
  --popover: 231 15% 20%;
  --popover-foreground: 60 30% 96%;
  --primary: 326 100% 74%;
  --primary-foreground: 231 15% 18%;
  --secondary: 231 13% 26%;
  --secondary-foreground: 60 30% 96%;
  --muted: 231 13% 26%;
  --muted-foreground: 231 10% 55%;
  --accent: 231 13% 26%;
  --accent-foreground: 60 30% 96%;
  --destructive: 0 100% 67%;
  --destructive-foreground: 60 30% 96%;
  --border: 231 13% 30%;
  --input: 231 13% 30%;
  --ring: 326 100% 74%;
  --radius: 0.5rem;
  --dark-950: 231 15% 18%;
  --dark-900: 231 15% 20%;
  --dark-800: 231 13% 26%;
  --dark-700: 231 12% 35%;
  --dark-600: 231 10% 45%;
  --dark-500: 231 8% 55%;
  --dark-400: 231 6% 65%;
  --dark-300: 231 4% 75%;
  --dark-200: 231 2% 85%;
  --primary-400: 326 100% 79%;
  --primary-500: 326 100% 74%;
  --primary-600: 326 100% 69%;
}

/* Nord */
.theme-nord {
  --background: 220 17% 17%;
  --foreground: 220 30% 90%;
  --card: 220 17% 20%;
  --card-foreground: 220 30% 90%;
  --popover: 220 17% 20%;
  --popover-foreground: 220 30% 90%;
  --primary: 194 100% 43%;
  --primary-foreground: 220 17% 17%;
  --secondary: 220 15% 25%;
  --secondary-foreground: 220 30% 90%;
  --muted: 220 15% 25%;
  --muted-foreground: 220 20% 55%;
  --accent: 220 15% 25%;
  --accent-foreground: 220 30% 90%;
  --destructive: 0 62% 50%;
  --destructive-foreground: 220 30% 90%;
  --border: 220 15% 30%;
  --input: 220 15% 30%;
  --ring: 194 100% 43%;
  --radius: 0.5rem;
  --dark-950: 220 17% 17%;
  --dark-900: 220 17% 20%;
  --dark-800: 220 15% 25%;
  --dark-700: 220 13% 35%;
  --dark-600: 220 11% 45%;
  --dark-500: 220 9% 55%;
  --dark-400: 220 7% 65%;
  --dark-300: 220 5% 75%;
  --dark-200: 220 3% 85%;
  --primary-400: 194 100% 48%;
  --primary-500: 194 100% 43%;
  --primary-600: 194 100% 38%;
}

/* Monokai */
.theme-monokai {
  --background: 240 20% 10%;
  --foreground: 60 30% 96%;
  --card: 240 20% 12%;
  --card-foreground: 60 30% 96%;
  --popover: 240 20% 12%;
  --popover-foreground: 60 30% 96%;
  --primary: 60 100% 50%;
  --primary-foreground: 240 20% 10%;
  --secondary: 240 15% 20%;
  --secondary-foreground: 60 30% 96%;
  --muted: 240 15% 20%;
  --muted-foreground: 240 10% 55%;
  --accent: 240 15% 20%;
  --accent-foreground: 60 30% 96%;
  --destructive: 0 62% 50%;
  --destructive-foreground: 60 30% 96%;
  --border: 240 15% 25%;
  --input: 240 15% 25%;
  --ring: 60 100% 50%;
  --radius: 0.5rem;
  --dark-950: 240 20% 10%;
  --dark-900: 240 20% 12%;
  --dark-800: 240 15% 20%;
  --dark-700: 240 12% 30%;
  --dark-600: 240 10% 40%;
  --dark-500: 240 8% 50%;
  --dark-400: 240 6% 60%;
  --dark-300: 240 4% 70%;
  --dark-200: 240 2% 80%;
  --primary-400: 60 100% 55%;
  --primary-500: 60 100% 50%;
  --primary-600: 60 100% 45%;
}

/* Solarized Dark */
.theme-solarized-dark {
  --background: 193 100% 7%;
  --foreground: 186 10% 90%;
  --card: 193 100% 9%;
  --card-foreground: 186 10% 90%;
  --popover: 193 100% 9%;
  --popover-foreground: 186 10% 90%;
  --primary: 45 100% 71%;
  --primary-foreground: 193 100% 7%;
  --secondary: 193 50% 15%;
  --secondary-foreground: 186 10% 90%;
  --muted: 193 50% 15%;
  --muted-foreground: 186 10% 55%;
  --accent: 193 50% 15%;
  --accent-foreground: 186 10% 90%;
  --destructive: 0 62% 50%;
  --destructive-foreground: 186 10% 90%;
  --border: 193 50% 20%;
  --input: 193 50% 20%;
  --ring: 45 100% 71%;
  --radius: 0.5rem;
  --dark-950: 193 100% 7%;
  --dark-900: 193 100% 9%;
  --dark-800: 193 50% 15%;
  --dark-700: 193 40% 25%;
  --dark-600: 193 30% 35%;
  --dark-500: 193 20% 45%;
  --dark-400: 193 15% 55%;
  --dark-300: 193 10% 65%;
  --dark-200: 193 5% 75%;
  --primary-400: 45 100% 76%;
  --primary-500: 45 100% 71%;
  --primary-600: 45 100% 66%;
}

/* GitHub Dark */
.theme-github-dark {
  --background: 210 10% 8%;
  --foreground: 210 15% 92%;
  --card: 210 10% 10%;
  --card-foreground: 210 15% 92%;
  --popover: 210 10% 10%;
  --popover-foreground: 210 15% 92%;
  --primary: 203 100% 32%;
  --primary-foreground: 210 10% 8%;
  --secondary: 210 10% 15%;
  --secondary-foreground: 210 15% 92%;
  --muted: 210 10% 15%;
  --muted-foreground: 210 10% 55%;
  --accent: 210 10% 15%;
  --accent-foreground: 210 15% 92%;
  --destructive: 0 62% 50%;
  --destructive-foreground: 210 15% 92%;
  --border: 210 10% 20%;
  --input: 210 10% 20%;
  --ring: 203 100% 32%;
  --radius: 0.375rem;
  --dark-950: 210 10% 8%;
  --dark-900: 210 10% 10%;
  --dark-800: 210 10% 15%;
  --dark-700: 210 8% 25%;
  --dark-600: 210 6% 35%;
  --dark-500: 210 5% 45%;
  --dark-400: 210 4% 55%;
  --dark-300: 210 3% 65%;
  --dark-200: 210 2% 75%;
  --primary-400: 203 100% 37%;
  --primary-500: 203 100% 32%;
  --primary-600: 203 100% 27%;
}

/* One Dark */
.theme-one-dark {
  --background: 220 13% 15%;
  --foreground: 220 15% 90%;
  --card: 220 13% 18%;
  --card-foreground: 220 15% 90%;
  --popover: 220 13% 18%;
  --popover-foreground: 220 15% 90%;
  --primary: 142 100% 48%;
  --primary-foreground: 220 13% 15%;
  --secondary: 220 10% 22%;
  --secondary-foreground: 220 15% 90%;
  --muted: 220 10% 22%;
  --muted-foreground: 220 10% 55%;
  --accent: 220 10% 22%;
  --accent-foreground: 220 15% 90%;
  --destructive: 0 62% 50%;
  --destructive-foreground: 220 15% 90%;
  --border: 220 10% 28%;
  --input: 220 10% 28%;
  --ring: 142 100% 48%;
  --radius: 0.5rem;
  --dark-950: 220 13% 15%;
  --dark-900: 220 13% 18%;
  --dark-800: 220 10% 22%;
  --dark-700: 220 8% 32%;
  --dark-600: 220 6% 42%;
  --dark-500: 220 5% 52%;
  --dark-400: 220 4% 62%;
  --dark-300: 220 3% 72%;
  --dark-200: 220 2% 82%;
  --primary-400: 142 100% 53%;
  --primary-500: 142 100% 48%;
  --primary-600: 142 100% 43%;
}

/* Tokyo Night */
.theme-tokyo-night {
  --background: 240 15% 8%;
  --foreground: 240 10% 92%;
  --card: 240 15% 10%;
  --card-foreground: 240 10% 92%;
  --popover: 240 15% 10%;
  --popover-foreground: 240 10% 92%;
  --primary: 355 85% 60%;
  --primary-foreground: 240 15% 8%;
  --secondary: 240 12% 16%;
  --secondary-foreground: 240 10% 92%;
  --muted: 240 12% 16%;
  --muted-foreground: 240 8% 55%;
  --accent: 240 12% 16%;
  --accent-foreground: 240 10% 92%;
  --destructive: 0 62% 50%;
  --destructive-foreground: 240 10% 92%;
  --border: 240 12% 22%;
  --input: 240 12% 22%;
  --ring: 355 85% 60%;
  --radius: 0.5rem;
  --dark-950: 240 15% 8%;
  --dark-900: 240 15% 10%;
  --dark-800: 240 12% 16%;
  --dark-700: 240 10% 26%;
  --dark-600: 240 8% 36%;
  --dark-500: 240 6% 46%;
  --dark-400: 240 5% 56%;
  --dark-300: 240 4% 66%;
  --dark-200: 240 3% 76%;
  --primary-400: 355 85% 65%;
  --primary-500: 355 85% 60%;
  --primary-600: 355 85% 55%;
}

/* Purple Haze */
.theme-purple-haze {
  --background: 270 20% 10%;
  --foreground: 270 10% 92%;
  --card: 270 20% 12%;
  --card-foreground: 270 10% 92%;
  --popover: 270 20% 12%;
  --popover-foreground: 270 10% 92%;
  --primary: 280 100% 60%;
  --primary-foreground: 270 20% 10%;
  --secondary: 270 15% 18%;
  --secondary-foreground: 270 10% 92%;
  --muted: 270 15% 18%;
  --muted-foreground: 270 10% 55%;
  --accent: 270 15% 18%;
  --accent-foreground: 270 10% 92%;
  --destructive: 0 62% 50%;
  --destructive-foreground: 270 10% 92%;
  --border: 270 15% 24%;
  --input: 270 15% 24%;
  --ring: 280 100% 60%;
  --radius: 0.5rem;
  --dark-950: 270 20% 10%;
  --dark-900: 270 20% 12%;
  --dark-800: 270 15% 18%;
  --dark-700: 270 12% 28%;
  --dark-600: 270 10% 38%;
  --dark-500: 270 8% 48%;
  --dark-400: 270 6% 58%;
  --dark-300: 270 4% 68%;
  --dark-200: 270 2% 78%;
  --primary-400: 280 100% 65%;
  --primary-500: 280 100% 60%;
  --primary-600: 280 100% 55%;
}

/* Cyberpunk */
.theme-cyberpunk {
  --background: 280 20% 8%;
  --foreground: 280 5% 95%;
  --card: 280 20% 10%;
  --card-foreground: 280 5% 95%;
  --popover: 280 20% 10%;
  --popover-foreground: 280 5% 95%;
  --primary: 320 100% 50%;
  --primary-foreground: 280 20% 8%;
  --secondary: 280 15% 15%;
  --secondary-foreground: 280 5% 95%;
  --muted: 280 15% 15%;
  --muted-foreground: 280 10% 55%;
  --accent: 280 15% 15%;
  --accent-foreground: 280 5% 95%;
  --destructive: 0 62% 50%;
  --destructive-foreground: 280 5% 95%;
  --border: 280 15% 22%;
  --input: 280 15% 22%;
  --ring: 320 100% 50%;
  --radius: 0.5rem;
  --dark-950: 280 20% 8%;
  --dark-900: 280 20% 10%;
  --dark-800: 280 15% 15%;
  --dark-700: 280 12% 25%;
  --dark-600: 280 10% 35%;
  --dark-500: 280 8% 45%;
  --dark-400: 280 6% 55%;
  --dark-300: 280 4% 65%;
  --dark-200: 280 2% 75%;
  --primary-400: 320 100% 55%;
  --primary-500: 320 100% 50%;
  --primary-600: 320 100% 45%;
}

/* === LIGHT THEMES (11) === */

/* Classic Light - Default light theme, pure black and white */
.theme-classic-light {
  --background: 0 0% 100%;
  --foreground: 0 0% 0%;
  --card: 0 0% 98%;
  --card-foreground: 0 0% 5%;
  --popover: 0 0% 98%;
  --popover-foreground: 0 0% 5%;
  --primary: 0 0% 0%;
  --primary-foreground: 0 0% 100%;
  --secondary: 0 0% 90%;
  --secondary-foreground: 0 0% 5%;
  --muted: 0 0% 90%;
  --muted-foreground: 0 0% 45%;
  --accent: 0 0% 90%;
  --accent-foreground: 0 0% 5%;
  --destructive: 0 62% 50%;
  --destructive-foreground: 0 0% 100%;
  --border: 0 0% 85%;
  --input: 0 0% 85%;
  --ring: 217 91% 60%;
  --radius: 0.5rem;
  --primary-400: 0 0% 10%;
  --primary-500: 0 0% 0%;
  --primary-600: 0 0% 5%;
}

/* GitHub Light */
.theme-github-light {
  --background: 210 20% 98%;
  --foreground: 210 10% 15%;
  --card: 210 20% 100%;
  --card-foreground: 210 10% 15%;
  --popover: 210 20% 100%;
  --popover-foreground: 210 10% 15%;
  --primary: 203 100% 32%;
  --primary-foreground: 210 20% 98%;
  --secondary: 210 15% 90%;
  --secondary-foreground: 210 10% 15%;
  --muted: 210 15% 90%;
  --muted-foreground: 210 10% 45%;
  --accent: 210 15% 90%;
  --accent-foreground: 210 10% 15%;
  --destructive: 0 62% 50%;
  --destructive-foreground: 210 20% 98%;
  --border: 210 15% 85%;
  --input: 210 15% 85%;
  --ring: 203 100% 32%;
  --radius: 0.375rem;
  --primary-400: 203 100% 37%;
  --primary-500: 203 100% 32%;
  --primary-600: 203 100% 27%;
}

/* Solarized Light */
.theme-solarized-light {
  --background: 44 87% 94%;
  --foreground: 192 15% 25%;
  --card: 44 87% 96%;
  --card-foreground: 192 15% 25%;
  --popover: 44 87% 96%;
  --popover-foreground: 192 15% 25%;
  --primary: 45 100% 71%;
  --primary-foreground: 44 87% 94%;
  --secondary: 44 30% 85%;
  --secondary-foreground: 192 15% 25%;
  --muted: 44 30% 85%;
  --muted-foreground: 192 10% 45%;
  --accent: 44 30% 85%;
  --accent-foreground: 192 15% 25%;
  --destructive: 0 62% 50%;
  --destructive-foreground: 44 87% 94%;
  --border: 44 30% 80%;
  --input: 44 30% 80%;
  --ring: 45 100% 71%;
  --radius: 0.5rem;
  --primary-400: 45 100% 76%;
  --primary-500: 45 100% 71%;
  --primary-600: 45 100% 66%;
}

/* Notion Light */
.theme-notion-light {
  --background: 0 0% 100%;
  --foreground: 0 0% 10%;
  --card: 0 0% 98%;
  --card-foreground: 0 0% 10%;
  --popover: 0 0% 98%;
  --popover-foreground: 0 0% 10%;
  --primary: 217 91% 60%;
  --primary-foreground: 0 0% 100%;
  --secondary: 0 0% 92%;
  --secondary-foreground: 0 0% 10%;
  --muted: 0 0% 92%;
  --muted-foreground: 0 0% 45%;
  --accent: 0 0% 92%;
  --accent-foreground: 0 0% 10%;
  --destructive: 0 62% 50%;
  --destructive-foreground: 0 0% 100%;
  --border: 0 0% 88%;
  --input: 0 0% 88%;
  --ring: 217 91% 60%;
  --radius: 0.375rem;
  --primary-400: 217 91% 65%;
  --primary-500: 217 91% 60%;
  --primary-600: 217 91% 50%;
}

/* Material Light */
.theme-material-light {
  --background: 210 40% 98%;
  --foreground: 210 10% 15%;
  --card: 210 40% 100%;
  --card-foreground: 210 10% 15%;
  --popover: 210 40% 100%;
  --popover-foreground: 210 10% 15%;
  --primary: 217 91% 60%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 30% 90%;
  --secondary-foreground: 210 10% 15%;
  --muted: 210 30% 90%;
  --muted-foreground: 210 10% 45%;
  --accent: 210 30% 90%;
  --accent-foreground: 210 10% 15%;
  --destructive: 0 62% 50%;
  --destructive-foreground: 210 40% 98%;
  --border: 210 25% 85%;
  --input: 210 25% 85%;
  --ring: 217 91% 60%;
  --radius: 0.25rem;
  --primary-400: 217 91% 65%;
  --primary-500: 217 91% 60%;
  --primary-600: 217 91% 50%;
}

/* Paper White */
.theme-paper-white {
  --background: 40 30% 98%;
  --foreground: 40 10% 15%;
  --card: 40 30% 100%;
  --card-foreground: 40 10% 15%;
  --popover: 40 30% 100%;
  --popover-foreground: 40 10% 15%;
  --primary: 200 50% 50%;
  --primary-foreground: 40 30% 98%;
  --secondary: 40 20% 90%;
  --secondary-foreground: 40 10% 15%;
  --muted: 40 20% 90%;
  --muted-foreground: 40 10% 45%;
  --accent: 40 20% 90%;
  --accent-foreground: 40 10% 15%;
  --destructive: 0 62% 50%;
  --destructive-foreground: 40 30% 98%;
  --border: 40 20% 85%;
  --input: 40 20% 85%;
  --ring: 200 50% 50%;
  --radius: 0.5rem;
  --primary-400: 200 50% 55%;
  --primary-500: 200 50% 50%;
  --primary-600: 200 50% 45%;
}

/* Warm Light */
.theme-warm-light {
  --background: 30 50% 95%;
  --foreground: 30 10% 15%;
  --card: 30 50% 98%;
  --card-foreground: 30 10% 15%;
  --popover: 30 50% 98%;
  --popover-foreground: 30 10% 15%;
  --primary: 217 91% 60%;
  --primary-foreground: 30 50% 95%;
  --secondary: 30 40% 88%;
  --secondary-foreground: 30 10% 15%;
  --muted: 30 40% 88%;
  --muted-foreground: 30 10% 45%;
  --accent: 30 40% 88%;
  --accent-foreground: 30 10% 15%;
  --destructive: 0 62% 50%;
  --destructive-foreground: 30 50% 95%;
  --border: 30 40% 82%;
  --input: 30 40% 82%;
  --ring: 217 91% 60%;
  --radius: 0.5rem;
  --primary-400: 217 91% 65%;
  --primary-500: 217 91% 60%;
  --primary-600: 217 91% 50%;
}

/* Cool Light */
.theme-cool-light {
  --background: 210 30% 96%;
  --foreground: 210 10% 15%;
  --card: 210 30% 98%;
  --card-foreground: 210 10% 15%;
  --popover: 210 30% 98%;
  --popover-foreground: 210 10% 15%;
  --primary: 195 100% 45%;
  --primary-foreground: 210 30% 96%;
  --secondary: 210 25% 90%;
  --secondary-foreground: 210 10% 15%;
  --muted: 210 25% 90%;
  --muted-foreground: 210 10% 45%;
  --accent: 210 25% 90%;
  --accent-foreground: 210 10% 15%;
  --destructive: 0 62% 50%;
  --destructive-foreground: 210 30% 96%;
  --border: 210 25% 85%;
  --input: 210 25% 85%;
  --ring: 195 100% 45%;
  --radius: 0.5rem;
  --primary-400: 195 100% 50%;
  --primary-500: 195 100% 45%;
  --primary-600: 195 100% 40%;
}

/* Rose Light */
.theme-rose-light {
  --background: 340 30% 96%;
  --foreground: 340 10% 15%;
  --card: 340 30% 98%;
  --card-foreground: 340 10% 15%;
  --popover: 340 30% 98%;
  --popover-foreground: 340 10% 15%;
  --primary: 340 80% 50%;
  --primary-foreground: 340 30% 96%;
  --secondary: 340 25% 90%;
  --secondary-foreground: 340 10% 15%;
  --muted: 340 25% 90%;
  --muted-foreground: 340 10% 45%;
  --accent: 340 25% 90%;
  --accent-foreground: 340 10% 15%;
  --destructive: 0 62% 50%;
  --destructive-foreground: 340 30% 96%;
  --border: 340 25% 85%;
  --input: 340 25% 85%;
  --ring: 340 80% 50%;
  --radius: 0.5rem;
  --primary-400: 340 80% 55%;
  --primary-500: 340 80% 50%;
  --primary-600: 340 80% 45%;
}

/* Mint Light */
.theme-mint-light {
  --background: 150 30% 96%;
  --foreground: 150 10% 15%;
  --card: 150 30% 98%;
  --card-foreground: 150 10% 15%;
  --popover: 150 30% 98%;
  --popover-foreground: 150 10% 15%;
  --primary: 150 100% 35%;
  --primary-foreground: 150 30% 96%;
  --secondary: 150 25% 90%;
  --secondary-foreground: 150 10% 15%;
  --muted: 150 25% 90%;
  --muted-foreground: 150 10% 45%;
  --accent: 150 25% 90%;
  --accent-foreground: 150 10% 15%;
  --destructive: 0 62% 50%;
  --destructive-foreground: 150 30% 96%;
  --border: 150 25% 85%;
  --input: 150 25% 85%;
  --ring: 150 100% 35%;
  --radius: 0.5rem;
  --primary-400: 150 100% 40%;
  --primary-500: 150 100% 35%;
  --primary-600: 150 100% 30%;
}

/* Cream Light */
.theme-cream-light {
  --background: 30 20% 96%;
  --foreground: 30 10% 15%;
  --card: 30 20% 98%;
  --card-foreground: 30 10% 15%;
  --popover: 30 20% 98%;
  --popover-foreground: 30 10% 15%;
  --primary: 30 80% 40%;
  --primary-foreground: 30 20% 96%;
  --secondary: 30 15% 90%;
  --secondary-foreground: 30 10% 15%;
  --muted: 30 15% 90%;
  --muted-foreground: 30 10% 45%;
  --accent: 30 15% 90%;
  --accent-foreground: 30 10% 15%;
  --destructive: 0 62% 50%;
  --destructive-foreground: 30 20% 96%;
  --border: 30 15% 85%;
  --input: 30 15% 85%;
  --ring: 30 80% 40%;
  --radius: 0.5rem;
  --primary-400: 30 80% 45%;
  --primary-500: 30 80% 40%;
  --primary-600: 30 80% 35%;
}
```

- [ ] **Step 3: Update the glass utility to work with light themes**

Modify `src/index.css` - replace the `.glass` utility (around line 66-68):

```css
.glass {
  background-color: hsl(var(--background) / 0.8);
  backdrop-filter: blur(12px);
}

.glass-border {
  border-color: hsl(var(--border) / 0.5);
}
```

This change makes `.glass` use `--background` variable instead of hardcoded `--dark-950`, ensuring it works correctly in both dark and light themes.

- [ ] **Step 4: Verify CSS syntax is valid**

Run: `npm run build`
Expected: PASS - no CSS syntax errors

- [ ] **Step 5: Commit CSS theme classes**

```bash
git add src/index.css
git commit -m "feat(css): add 22 pre-configured theme CSS classes"
```

---

## Task 3: Theme Application Hook

**Files:**
- Create: `src/hooks/useThemeEffect.ts`
- Modify: `src/stores/app.ts`
- Test: `src/hooks/useThemeEffect.test.ts`

- [ ] **Step 1: Write the failing test for useThemeEffect**

Create `src/hooks/useThemeEffect.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useThemeEffect } from './useThemeEffect'
import * as appStore from '@/stores/app'
import * as registry from '@/themes/registry'

// Mock window.matchMedia
const mockMatchMedia = vi.fn()
beforeEach(() => {
  window.matchMedia = mockMatchMedia
  mockMatchMedia.mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('useThemeEffect', () => {
  it('applies theme class to document root when theme is specific ID', () => {
    // Mock store state
    vi.spyOn(appStore, 'useAppStore').mockImplementation(() => ({
      theme: 'dracula',
      setTheme: vi.fn(),
    }))

    renderHook(() => useThemeEffect())

    expect(document.documentElement.classList.contains('theme-dracula')).toBe(true)
  })

  it('applies midnight when system preference is dark and theme is system', () => {
    mockMatchMedia.mockReturnValue({
      matches: true, // dark preference
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })

    vi.spyOn(appStore, 'useAppStore').mockImplementation(() => ({
      theme: 'system',
      setTheme: vi.fn(),
    }))

    renderHook(() => useThemeEffect())

    expect(document.documentElement.classList.contains('theme-midnight')).toBe(true)
  })

  it('applies classic-light when system preference is light and theme is system', () => {
    mockMatchMedia.mockReturnValue({
      matches: false, // light preference
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })

    vi.spyOn(appStore, 'useAppStore').mockImplementation(() => ({
      theme: 'system',
      setTheme: vi.fn(),
    }))

    renderHook(() => useThemeEffect())

    expect(document.documentElement.classList.contains('theme-classic-light')).toBe(true)
  })

  it('removes old theme class before adding new one', () => {
    document.documentElement.classList.add('theme-midnight')

    vi.spyOn(appStore, 'useAppStore').mockImplementation(() => ({
      theme: 'nord',
      setTheme: vi.fn(),
    }))

    renderHook(() => useThemeEffect())

    expect(document.documentElement.classList.contains('theme-midnight')).toBe(false)
    expect(document.documentElement.classList.contains('theme-nord')).toBe(true)
  })

  it('sets data attributes on document root', () => {
    vi.spyOn(appStore, 'useAppStore').mockImplementation(() => ({
      theme: 'github-dark',
      setTheme: vi.fn(),
    }))

    renderHook(() => useThemeEffect())

    expect(document.documentElement.dataset.theme).toBe('github-dark')
    expect(document.documentElement.dataset.themeCategory).toBe('dark')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `vitest run src/hooks/useThemeEffect.test.ts`
Expected: FAIL - "Cannot find module './useThemeEffect'"

- [ ] **Step 3: Write minimal implementation**

Create `src/hooks/useThemeEffect.ts`:

```typescript
import { useEffect } from 'react'
import { useAppStore } from '@/stores/app'
import { getThemeById, getDefaultThemeForCategory } from '@/themes/registry'
import type { ThemeCategory } from '@/themes/registry'

/**
 * Gets the system color scheme preference
 */
export function getSystemPreference(): ThemeCategory {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * Resolves the active theme ID from the store theme state
 * - If theme is 'system', returns default theme for current system preference
 * - Otherwise, returns the theme ID directly
 */
export function getActiveThemeId(themeState: 'system' | string): string {
  if (themeState === 'system') {
    const category = getSystemPreference()
    return getDefaultThemeForCategory(category).id
  }
  return themeState
}

/**
 * React hook that applies the current theme to the document root
 * - Adds .theme-{id} class to <html>
 * - Sets data-theme and data-themeCategory attributes
 * - Removes old theme class before adding new one
 */
export function useThemeEffect() {
  const { theme } = useAppStore()

  useEffect(() => {
    const root = document.documentElement
    const activeThemeId = getActiveThemeId(theme)
    const themeMeta = getThemeById(activeThemeId)

    // Remove all existing theme classes
    const oldThemeClasses = Array.from(root.classList).filter(c => c.startsWith('theme-'))
    root.classList.remove(...oldThemeClasses)

    // Add new theme class
    root.classList.add(`theme-${activeThemeId}`)

    // Set data attributes for potential CSS selector usage
    root.dataset.theme = activeThemeId
    root.dataset.themeCategory = themeMeta?.category ?? 'dark'
  }, [theme])
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `vitest run src/hooks/useThemeEffect.test.ts`
Expected: PASS - all 5 test cases pass

- [ ] **Step 5: Modify app.ts store to change theme type**

Read current `src/stores/app.ts` and modify:

Change the `theme` type and add export for helper functions:

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ConnectionStatus } from '@/lib/websocket-client'

export type ApiMode = 'direct' | 'proxy'
export const PROXY_BASE_URL = '/api'

// Export these for use in other modules
export type ThemeState = 'system' | string

interface AppState {
  apiKey: string
  region: 'cn' | 'intl'
  theme: ThemeState  // 'system' or specific theme ID like 'midnight', 'github-light'
  apiMode: ApiMode
  wsStatus: ConnectionStatus
  hasCompletedOnboarding: boolean
  setApiKey: (key: string) => void
  setRegion: (region: 'cn' | 'intl') => void
  setTheme: (theme: ThemeState) => void
  setApiMode: (mode: ApiMode) => void
  setWsStatus: (status: ConnectionStatus) => void
  setHasCompletedOnboarding: (value: boolean) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      apiKey: '',
      region: 'cn',
      theme: 'system',  // Default to follow system preference
      apiMode: 'direct',
      wsStatus: 'disconnected',
      hasCompletedOnboarding: false,
      setApiKey: (key) => set({ apiKey: key }),
      setRegion: (region) => set({ region: region }),
      setTheme: (theme) => set({ theme: theme }),
      setApiMode: (mode) => set({ apiMode: mode }),
      setWsStatus: (status) => set({ wsStatus: status }),
      setHasCompletedOnboarding: (value) => set({ hasCompletedOnboarding: value }),
    }),
    {
      name: 'minimax-app-storage',
    }
  )
)
```

- [ ] **Step 6: Commit hook and store changes**

```bash
git add src/hooks/useThemeEffect.ts src/hooks/useThemeEffect.test.ts src/stores/app.ts
git commit -m "feat(hooks): add useThemeEffect hook for theme application"
```

---

## Task 4: Settings UI Components

**Files:**
- Create: `src/components/settings/SystemOption.tsx`
- Create: `src/components/settings/ThemeCard.tsx`
- Create: `src/components/settings/ThemePicker.tsx`
- Create: `src/components/settings/SettingsModal.tsx`
- Create: `src/components/settings/index.ts`

- [ ] **Step 1: Create SystemOption component**

Create `src/components/settings/SystemOption.tsx`:

```typescript
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

interface SystemOptionProps {
  selected: boolean
  onSelect: () => void
}

export function SystemOption({ selected, onSelect }: SystemOptionProps) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full p-4 rounded-lg border transition-all cursor-pointer',
        'flex items-center gap-3',
        selected
          ? 'border-primary-500 bg-primary-500/10 ring-2 ring-primary-500/20'
          : 'border-dark-700 hover:border-dark-600 bg-dark-900/50'
      )}
    >
      {/* Icon */}
      <div className="w-10 h-10 rounded-full bg-dark-800 flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-dark-600 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-dark-800 to-dark-400 rounded-full" />
        </div>
      </div>
      
      {/* Text */}
      <div className="flex-1 text-left">
        <span className="text-sm font-medium text-foreground">
          Follow system preference
        </span>
        <span className="text-xs text-muted-foreground block mt-1">
          Automatically switch between dark and light themes
        </span>
      </div>
      
      {/* Selected indicator */}
      {selected && (
        <Check className="w-5 h-5 text-primary-500" />
      )}
    </button>
  )
}
```

- [ ] **Step 2: Create ThemeCard component**

Create `src/components/settings/ThemeCard.tsx`:

```typescript
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'
import type { ThemeMeta } from '@/themes/registry'

interface ThemeCardProps {
  theme: ThemeMeta
  selected: boolean
  onSelect: () => void
}

export function ThemeCard({ theme, selected, onSelect }: ThemeCardProps) {
  const isDark = theme.category === 'dark'
  const textColor = isDark ? '210 40% 98%' : '220 20% 10%'

  return (
    <button
      onClick={onSelect}
      className={cn(
        'relative p-3 rounded-lg border transition-all cursor-pointer',
        'hover:scale-[1.02] active:scale-[0.98]',
        'duration-150',
        selected
          ? 'border-primary-500 ring-2 ring-primary-500/30'
          : 'border-dark-700 hover:border-dark-600'
      )}
      style={{ backgroundColor: `hsl(${theme.preview.background})` }}
    >
      {/* Primary color preview circle */}
      <div
        className="w-8 h-8 rounded-full mb-2 shadow-sm"
        style={{ backgroundColor: `hsl(${theme.preview.primary})` }}
      />

      {/* Theme name */}
      <span
        className="text-sm font-medium block"
        style={{ color: `hsl(${textColor})` }}
      >
        {theme.name}
      </span>

      {/* Selected indicator */}
      {selected && (
        <div className="absolute top-2 right-2">
          <Check className="w-4 h-4" style={{ color: `hsl(${theme.preview.primary})` }} />
        </div>
      )}
    </button>
  )
}
```

- [ ] **Step 3: Create ThemePicker component**

Create `src/components/settings/ThemePicker.tsx`:

```typescript
import { useState } from 'react'
import { useAppStore } from '@/stores/app'
import { getThemeById, getThemesByCategory } from '@/themes/registry'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { SystemOption } from './SystemOption'
import { ThemeCard } from './ThemeCard'
import type { ThemeCategory } from '@/themes/registry'

type TabValue = 'system' | 'dark' | 'light'

export function ThemePicker() {
  const { theme, setTheme } = useAppStore()

  // Determine initial tab based on current theme
  const getInitialTab = (): TabValue => {
    if (theme === 'system') return 'system'
    const themeMeta = getThemeById(theme)
    return themeMeta?.category ?? 'dark'
  }

  const [activeTab, setActiveTab] = useState<TabValue>(getInitialTab())

  // Get themes for current tab
  const themes = activeTab === 'system'
    ? []
    : getThemesByCategory(activeTab as ThemeCategory)

  return (
    <div className="space-y-4">
      {/* Tabs: System / Dark / Light */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="system" className="flex-1">
            System
          </TabsTrigger>
          <TabsTrigger value="dark" className="flex-1">
            Dark
          </TabsTrigger>
          <TabsTrigger value="light" className="flex-1">
            Light
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* System option */}
      {activeTab === 'system' && (
        <SystemOption
          selected={theme === 'system'}
          onSelect={() => setTheme('system')}
        />
      )}

      {/* Theme grid */}
      {activeTab !== 'system' && (
        <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1">
          {themes.map((t) => (
            <ThemeCard
              key={t.id}
              theme={t}
              selected={theme === t.id}
              onSelect={() => setTheme(t.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create SettingsModal component**

Create `src/components/settings/SettingsModal.tsx`:

```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { ThemePicker } from './ThemePicker'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-lg bg-dark-950/90 backdrop-blur-xl border-dark-800/50"
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Theme Section */}
          <section>
            <h3 className="text-sm font-medium text-muted-foreground mb-4">
              Theme
            </h3>
            <ThemePicker />
          </section>

          {/* Future settings sections can be added here */}
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 5: Create barrel export**

Create `src/components/settings/index.ts`:

```typescript
export { SettingsModal } from './SettingsModal'
export { ThemePicker } from './ThemePicker'
export { ThemeCard } from './ThemeCard'
export { SystemOption } from './SystemOption'
```

- [ ] **Step 6: Verify components compile**

Run: `npm run build`
Expected: PASS - no TypeScript errors

- [ ] **Step 7: Commit settings components**

```bash
git add src/components/settings/
git commit -m "feat(ui): add SettingsModal and ThemePicker components"
```

---

## Task 5: Integrate Settings into Sidebar

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Read current Sidebar.tsx footer section**

Run: `grep -n "flex-shrink-0" src/components/layout/Sidebar.tsx`
Identify the footer section around lines 232-256.

- [ ] **Step 2: Add settings icon and modal to Sidebar**

Modify `src/components/layout/Sidebar.tsx`:

Add imports at top (after existing imports):

```typescript
import { Settings } from 'lucide-react'
import { useState } from 'react'
import { SettingsModal } from '@/components/settings'
```

Add state before the component return:

```typescript
const [showSettingsModal, setShowSettingsModal] = useState(false)
```

Modify the footer section (around line 233-256):

```typescript
{/* Settings Modal */}
<SettingsModal 
  open={showSettingsModal} 
  onClose={() => setShowSettingsModal(false)} 
/>

{/* Footer */}
<div className="flex-shrink-0 p-4 border-t border-dark-800/50 bg-dark-950/80 backdrop-blur-sm">
  <div className="flex items-center justify-between">
    {/* Logo */}
    <div className="flex items-center gap-2 text-dark-400">
      <div className="w-5 h-5 rounded bg-primary-600 flex items-center justify-center">
        <span className="text-white font-bold text-[10px]">M</span>
      </div>
      <span className="text-xs">{t('sidebar.createdBy')}</span>
    </div>
    
    {/* Action icons */}
    <div className="flex items-center gap-2">
      {/* Settings button */}
      <button
        onClick={() => setShowSettingsModal(true)}
        className="text-dark-400 hover:text-white transition-colors"
        title="Settings"
      >
        <Settings className="w-4 h-4" />
      </button>
      
      {/* Shortcuts help */}
      <ShortcutsHelpButton />
      
      {/* GitHub link */}
      <a
        href="https://github.com/oGsLP/mnx-agent"
        target="_blank"
        rel="noopener noreferrer"
        className="text-dark-400 hover:text-white transition-colors"
        title="GitHub"
      >
        <Github className="w-4 h-4" />
      </a>
    </div>
  </div>
</div>
```

- [ ] **Step 3: Verify Sidebar compiles**

Run: `npm run build`
Expected: PASS - no TypeScript errors

- [ ] **Step 4: Commit Sidebar changes**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat(sidebar): add Settings icon and modal trigger"
```

---

## Task 6: Apply Theme at App Level

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Find App.tsx location and structure**

Run: `cat src/App.tsx`

Note the component structure and where to add the hook.

- [ ] **Step 2: Add useThemeEffect to App.tsx**

Modify `src/App.tsx`:

Add import at top:

```typescript
import { useThemeEffect } from '@/hooks/useThemeEffect'
```

Add hook call inside the App component (before the return):

```typescript
function App() {
  // Apply theme from store
  useThemeEffect()

  return (
    // ... existing return content
  )
}
```

- [ ] **Step 3: Verify App compiles**

Run: `npm run build`
Expected: PASS - no TypeScript errors

- [ ] **Step 4: Commit App.tsx changes**

```bash
git add src/App.tsx
git commit -m "feat(app): apply theme at root level with useThemeEffect"
```

---

## Task 7: Integration Test and Final Verification

**Files:**
- Test: Full application

- [ ] **Step 1: Run all unit tests**

Run: `vitest run`
Expected: PASS - all tests pass

- [ ] **Step 2: Build production bundle**

Run: `npm run build`
Expected: PASS - no build errors

- [ ] **Step 3: Start development server and manually verify**

Run: `npm run dev:full`

Manually verify:
1. Sidebar shows Settings icon (gear)
2. Click Settings → Modal opens with backdrop blur
3. Theme picker shows System/Dark/Light tabs
4. Dark tab shows 11 dark themes
5. Light tab shows 11 light themes
6. Click theme → UI changes immediately
7. Refresh page → Theme persists (localStorage)
8. Theme 'system' → Follows OS preference

- [ ] **Step 4: Create integration test for theme switching**

Create `src/integration/theme.test.ts` (optional, if time permits):

```typescript
import { describe, it, expect } from 'vitest'

describe('Theme System Integration', () => {
  it('theme registry contains all required themes', async () => {
    const { THEME_REGISTRY } = await import('@/themes/registry')
    expect(THEME_REGISTRY.length).toBe(22)
    expect(THEME_REGISTRY.filter(t => t.category === 'dark').length).toBe(11)
    expect(THEME_REGISTRY.filter(t => t.category === 'light').length).toBe(11)
  })

  it('CSS classes are defined for all themes', async () => {
    const cssContent = await import('@/index.css?raw')
    THEME_REGISTRY.forEach(theme => {
      expect(cssContent.includes(`.theme-${theme.id}`)).toBe(true)
    })
  })
})
```

- [ ] **Step 5: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: resolve integration issues for theme system"
```

---

## Self-Review Checklist

Run this checklist before handing off execution:

**1. Spec coverage:**
- [ ] 22 pre-configured themes (11 dark + 11 light) → Task 1 (registry), Task 2 (CSS)
- [ ] CSS Classes approach → Task 2
- [ ] Theme registry TypeScript → Task 1
- [ ] useThemeEffect hook → Task 3
- [ ] Settings Modal with backdrop blur → Task 4
- [ ] Theme Picker with tabs → Task 4
- [ ] Theme preview cards → Task 4
- [ ] Sidebar settings icon → Task 5
- [ ] Theme persistence via Zustand → Task 3
- [ ] System preference following → Task 3 (getSystemPreference)
- [ ] App-level theme application → Task 6

**2. Placeholder scan:**
- [ ] No "TBD", "TODO", "implement later"
- [ ] All code blocks contain complete implementation
- [ ] All test blocks contain complete test code
- [ ] No vague descriptions without code

**3. Type consistency:**
- [ ] ThemeMeta.id used consistently
- [ ] ThemeCategory = 'light' | 'dark' used consistently
- [ ] ThemeState = 'system' | string used consistently
- [ ] getThemeById returns ThemeMeta | undefined
- [ ] getActiveThemeId returns string

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-02-theme-system.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**