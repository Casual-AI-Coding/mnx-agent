# Theme System Design

**Date**: 2026-04-02
**Status**: Draft
**Author**: AI Assistant

---

## Overview

设计一个完整的主题系统，支持 22+ 预置主题，分为深色 (dark) 和浅色 (light) 两大类。用户可通过 Sidebar 底部的设置图标打开 Modal 选择主题，支持跟随系统偏好自动切换。

---

## Requirements Summary

| Requirement | Decision |
|-------------|----------|
| 主题命名风格 | 品牌风格命名 (Ocean Blue, Midnight, Solarized 等) |
| UI 位置 | Sidebar 底部设置图标 → Modal |
| 系统跟随 | 保留 'system' 选项 |
| 控制范围 | 全 UI 变量控制 (background, foreground, primary, etc.) |
| 实现方案 | CSS Classes + 预定义变量 |

---

## Architecture

### 1. Theme Definition (CSS Classes)

每个主题在 `src/index.css` 中定义为独立的 CSS 类，使用 `.theme-{id}` 命名模式。

**CSS 变量覆盖范围**:

```css
.theme-{id} {
  /* Semantic colors */
  --background: HSL;
  --foreground: HSL;
  --card: HSL;
  --card-foreground: HSL;
  --popover: HSL;
  --popover-foreground: HSL;
  --primary: HSL;
  --primary-foreground: HSL;
  --secondary: HSL;
  --secondary-foreground: HSL;
  --muted: HSL;
  --muted-foreground: HSL;
  --accent: HSL;
  --accent-foreground: HSL;
  --destructive: HSL;
  --destructive-foreground: HSL;
  --border: HSL;
  --input: HSL;
  --ring: HSL;
  --radius: rem;
  
  /* Dark palette (only for dark themes) */
  --dark-950: HSL;
  --dark-900: HSL;
  --dark-800: HSL;
  --dark-700: HSL;
  --dark-600: HSL;
  --dark-500: HSL;
  --dark-400: HSL;
  --dark-300: HSL;
  --dark-200: HSL;
  
  /* Primary variants */
  --primary-400: HSL;
  --primary-500: HSL;
  --primary-600: HSL;
}
```

**命名约定**:
- 主题 ID 使用小写 + 连字符: `midnight`, `ocean-blue`, `solarized-light`
- CSS 类名: `.theme-{id}`
- 所有变量使用 HSL 格式 (无 `hsl()` 包装，Tailwind 配置会自动处理)

---

### 2. Theme Registry (TypeScript)

主题元数据定义在 `src/themes/registry.ts`，提供类型安全和 UI 渲染所需信息。

```typescript
export type ThemeCategory = 'light' | 'dark'

export interface ThemeMeta {
  id: string                    // 主题 ID
  name: string                  // 显示名称
  category: ThemeCategory       // 分类
  preview: {
    background: string          // 预览卡片背景色 (HSL)
    primary: string             // 预览卡片主色 (HSL)
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
```

**导出函数**:
- `getThemeById(id: string): ThemeMeta | undefined`
- `getThemesByCategory(category: ThemeCategory): ThemeMeta[]`
- `getDefaultThemeForCategory(category: ThemeCategory): ThemeMeta`

---

### 3. State Management (Zustand)

扩展现有 `src/stores/app.ts`，添加主题状态。

**现有状态**:
```typescript
interface AppState {
  theme: 'light' | 'dark' | 'system'  // 现有，但未实现
  setTheme: (theme: 'light' | 'dark' | 'system') => void
}
```

**修改为**:
```typescript
interface AppState {
  theme: 'system' | string  // 'system' 或具体主题 ID
  setTheme: (theme: 'system' | string) => void
}
```

**新增辅助函数**:
```typescript
// 获取系统偏好
function getSystemPreference(): ThemeCategory {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

// 获取实际应用的主题 ID
function getActiveThemeId(themeState: 'system' | string): string {
  if (themeState === 'system') {
    const category = getSystemPreference()
    return category === 'dark' ? 'midnight' : 'classic-light'
  }
  return themeState
}

// 导出供组件使用
export { getActiveThemeId, getSystemPreference }
```

**存储**:
- 使用现有 `persist` middleware
- 存储 key: `'minimax-app-storage'`
- 只存储 `theme` 字符串值

---

### 4. Theme Application Mechanism

通过 React Hook 监听主题状态变化，动态更新 `<html>` 元素的 CSS 类。

**Hook 定义** (`src/hooks/useThemeEffect.ts`):
```typescript
export function useThemeEffect() {
  const { theme } = useAppStore()
  
  useEffect(() => {
    const root = document.documentElement
    const activeThemeId = getActiveThemeId(theme)
    
    // 移除所有旧主题类
    const oldThemeClasses = root.classList.filter(c => c.startsWith('theme-'))
    root.classList.remove(...oldThemeClasses)
    
    // 添加新主题类
    root.classList.add(`theme-${activeThemeId}`)
    
    // 更新 data 属性
    const meta = getThemeById(activeThemeId)
    root.dataset.theme = activeThemeId
    root.dataset.themeCategory = meta?.category ?? 'dark'
  }, [theme])
}
```

**系统偏好监听** (可选增强):
```typescript
// 监听系统偏好变化
useEffect(() => {
  if (theme !== 'system') return
  
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const handleChange = () => {
    // 触发 re-render，getActiveThemeId 会返回新的默认主题
    setTheme('system')  // 强制更新
  }
  
  mediaQuery.addEventListener('change', handleChange)
  return () => mediaQuery.removeEventListener('change', handleChange)
}, [theme])
```

**应用入口** (`src/App.tsx`):
```typescript
function App() {
  useThemeEffect()  // 必须在顶层调用
  return <AppRouter />
}
```

---

### 5. UI Components

#### 5.1 Sidebar Settings Icon

修改 `src/components/layout/Sidebar.tsx`，在 footer 区域添加设置图标。

**位置**: 底部 footer，与 GitHub 链接、快捷键帮助按钮并列。

```typescript
// Sidebar footer section
<div className="flex-shrink-0 p-4 border-t border-dark-800/50">
  <div className="flex items-center justify-between">
    {/* Logo */}
    <div className="flex items-center gap-2">
      <Logo />
    </div>
    
    {/* Action icons */}
    <div className="flex items-center gap-2">
      <SettingsButton onClick={() => setShowSettingsModal(true)} />
      <ShortcutsHelpButton />
      <GitHubLink />
    </div>
  </div>
</div>

{/* Settings Modal */}
<SettingsModal open={showSettingsModal} onClose={() => setShowSettingsModal(false)} />
```

#### 5.2 Settings Modal

新建 `src/components/settings/SettingsModal.tsx`。

**特性**:
- 模糊背景 (`backdrop-blur-xl`)
- 深色玻璃效果 (`bg-dark-950/90`)
- 多个设置分组（主题、其他设置预留）

```typescript
interface Props {
  open: boolean
  onClose: () => void
}

export function SettingsModal({ open, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent 
        className="max-w-lg bg-dark-950/90 backdrop-blur-xl border-dark-800/50"
      >
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Theme Section */}
          <section>
            <h3 className="text-sm font-medium text-dark-300 mb-4">
              Theme
            </h3>
            <ThemePicker />
          </section>
          
          {/* Other settings sections - placeholder for future */}
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

#### 5.3 Theme Picker

新建 `src/components/settings/ThemePicker.tsx`。

**布局**:
- 顶部 Tabs: `System | Dark | Light`
- System tab: 单选按钮 (Follow system preference)
- Dark/Light tabs: 主题卡片网格 (2 列)

```typescript
export function ThemePicker() {
  const { theme, setTheme } = useAppStore()
  
  // 根据当前主题推断 active tab
  const initialTab = theme === 'system' 
    ? 'system' 
    : getThemeById(theme)?.category ?? 'dark'
  
  const [activeTab, setActiveTab] = useState<'system' | 'dark' | 'light'>(initialTab)
  
  const themes = activeTab === 'system' 
    ? [] 
    : getThemesByCategory(activeTab)
  
  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="w-full">
          <TabsTrigger value="system" className="flex-1">System</TabsTrigger>
          <TabsTrigger value="dark" className="flex-1">Dark</TabsTrigger>
          <TabsTrigger value="light" className="flex-1">Light</TabsTrigger>
        </TabsList>
      </Tabs>
      
      {activeTab === 'system' && (
        <SystemOption selected={theme === 'system'} onSelect={() => setTheme('system')} />
      )}
      
      {activeTab !== 'system' && (
        <div className="grid grid-cols-2 gap-3">
          {themes.map(t => (
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

#### 5.4 Theme Card

单个主题预览卡片，用于 Theme Picker。

```typescript
interface ThemeCardProps {
  theme: ThemeMeta
  selected: boolean
  onSelect: () => void
}

function ThemeCard({ theme, selected, onSelect }: ThemeCardProps) {
  const isDark = theme.category === 'dark'
  const textColor = isDark ? '210 40% 98%' : '220 20% 10%'
  
  return (
    <button
      onClick={onSelect}
      className={cn(
        "relative p-3 rounded-lg border transition-all cursor-pointer",
        "hover:scale-[1.02] active:scale-[0.98]",
        selected 
          ? "border-primary-500 ring-2 ring-primary-500/30"
          : "border-dark-700 hover:border-dark-600"
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
          <Check className="w-4 h-4 text-primary-500" />
        </div>
      )}
    </button>
  )
}
```

---

### 6. Pre-configured Themes (22 Total)

#### Dark Themes (11)

| ID | Name | Background | Primary | Notes |
|----|------|------------|---------|-------|
| `midnight` | Midnight | 220 20% 6% | 217 91% 60% | 默认深色，保持现有配色 |
| `ocean-blue` | Ocean Blue | 210 50% 8% | 200 100% 50% | 海洋蓝色调 |
| `dracula` | Dracula | 231 15% 18% | 326 100% 74% | 经典 Dracula 配色 |
| `nord` | Nord | 220 17% 17% | 194 100% 43% | Nord 主题配色 |
| `monokai` | Monokai | 240 20% 10% | 60 100% 50% | Monokai 经典配色 |
| `solarized-dark` | Solarized Dark | 193 100% 7% | 45 100% 71% | Solarized 深色版 |
| `github-dark` | GitHub Dark | 210 10% 8% | 203 100% 32% | GitHub 深色主题 |
| `one-dark` | One Dark | 220 13% 15% | 142 100% 48% | Atom One Dark |
| `tokyo-night` | Tokyo Night | 240 15% 8% | 355 85% 60% | Tokyo Night 配色 |
| `purple-haze` | Purple Haze | 270 20% 10% | 280 100% 60% | 紫色调深色主题 |
| `cyberpunk` | Cyberpunk | 280 20% 8% | 320 100% 50% | 霓虹赛博朋克风格 |

#### Light Themes (11)

| ID | Name | Background | Primary | Notes |
|----|------|------------|---------|-------|
| `classic-light` | Classic Light | 0 0% 100% | 0 0% 0% | 默认浅色，纯黑白 |
| `github-light` | GitHub Light | 210 20% 98% | 203 100% 32% | GitHub 浅色主题 |
| `solarized-light` | Solarized Light | 44 87% 94% | 45 100% 71% | Solarized 浅色版 |
| `notion-light` | Notion Light | 0 0% 100% | 217 91% 60% | Notion 风格 |
| `material-light` | Material Light | 210 40% 98% | 217 91% 60% | Material Design 风格 |
| `paper-white` | Paper White | 40 30% 98% | 200 50% 50% | 纸张白色，柔和蓝灰 |
| `warm-light` | Warm Light | 30 50% 95% | 217 91% 60% | 温暖色调浅色 |
| `cool-light` | Cool Light | 210 30% 96% | 195 100% 45% | 冷色调浅色 |
| `rose-light` | Rose Light | 340 30% 96% | 340 80% 50% | 玫瑰色调 |
| `mint-light` | Mint Light | 150 30% 96% | 150 100% 35% | 薄荷色调 |
| `cream-light` | Cream Light | 30 20% 96% | 30 80% 40% | 奶油色调 |

---

## Implementation Notes

### CSS File Structure

`src/index.css` 将包含:
1. Tailwind directives (base, components, utilities)
2. 基础层 (`@layer base`) - 默认变量定义
3. 主题类定义 - 所有 `.theme-{id}` 类
4. 自定义 utilities - `.bg-grid`, `.glass` 等

**预估文件大小**: ~30KB (22 主题 × 30 变量 × ~45 bytes)

### Migration Path

1. **Step 1**: 定义所有主题 CSS 类在 `index.css`
2. **Step 2**: 创建 `themes/registry.ts` 类型定义
3. **Step 3**: 创建 `hooks/useThemeEffect.ts` 应用机制
4. **Step 4**: 创建 `components/settings/` UI 组件
5. **Step 5**: 修改 `stores/app.ts` 状态
6. **Step 6**: 修改 `components/layout/Sidebar.tsx` 添加设置入口
7. **Step 7**: 在 `App.tsx` 调用 `useThemeEffect`

### Testing Strategy

- **Unit tests**: `useThemeEffect` hook 行为
- **Unit tests**: `getActiveThemeId` 函数逻辑
- **E2E tests**: 主题切换功能
- **Visual tests**: 各主题渲染效果

---

## Future Enhancements

1. **主题自定义**: 允许用户微调主色/背景色
2. **主题导入/导出**: JSON 格式主题配置文件
3. **主题商店**: 社区贡献的主题库
4. **主题预览悬浮**: Hover 时实时预览效果（而非切换后预览）

---

## Appendix: Full CSS Variables per Theme

See implementation phase for complete CSS definitions. Each theme will define approximately 30 CSS variables covering:
- 15 semantic colors (background, foreground, card, popover, primary, secondary, muted, accent, destructive, border, input, ring, plus their foreground variants)
- 3 primary color variants (400, 500, 600)
- 9 dark palette variants (for dark themes only)
- 1 radius value