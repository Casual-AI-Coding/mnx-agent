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

const DEFAULT_DARK_THEME = 'midnight'
const DEFAULT_LIGHT_THEME = 'classic-light'

export function getDefaultThemeForCategory(category: ThemeCategory): ThemeMeta {
  const defaultId = category === 'dark' ? DEFAULT_DARK_THEME : DEFAULT_LIGHT_THEME
  const theme = THEME_REGISTRY.find(t => t.id === defaultId)
  if (!theme) {
    return THEME_REGISTRY[0]
  }
  return theme
}