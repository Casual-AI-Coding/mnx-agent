export type ThemeCategory = 'light' | 'dark' | 'style'

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
  
  // Style themes - Games (6)
  { id: 'wukong', name: '黑神话悟空', category: 'style',
    preview: { background: '30 15% 8%', primary: '45 90% 55%' } },
  { id: 'cyberpunk-2077', name: '赛博朋克2077', category: 'style',
    preview: { background: '280 20% 6%', primary: '320 100% 50%' } },
  { id: 'starcraft', name: '星际争霸二', category: 'style',
    preview: { background: '200 30% 8%', primary: '180 100% 45%' } },
  { id: 'genshin', name: '原神', category: 'style',
    preview: { background: '260 20% 10%', primary: '280 80% 60%' } },
  { id: 'spider-man', name: '漫威蜘蛛侠', category: 'style',
    preview: { background: '220 20% 12%', primary: '0 85% 50%' } },
  { id: 'wow', name: '魔兽世界', category: 'style',
    preview: { background: '220 15% 8%', primary: '140 60% 45%' } },
  
  // Style themes - Anime (9)
  { id: 'super-saiyan', name: '超级赛亚人', category: 'style',
    preview: { background: '45 15% 10%', primary: '45 100% 60%' } },
  { id: 'iori', name: '八神庵', category: 'style',
    preview: { background: '270 20% 8%', primary: '280 100% 50%' } },
  { id: 'zangief', name: '桑吉尔夫', category: 'style',
    preview: { background: '0 15% 10%', primary: '0 80% 50%' } },
  { id: 'mccree', name: '麦克雷', category: 'style',
    preview: { background: '30 20% 12%', primary: '30 90% 50%' } },
  { id: 'dragon-ball', name: '龙珠', category: 'style',
    preview: { background: '210 20% 12%', primary: '35 100% 55%' } },
  { id: 'bleach', name: '死神', category: 'style',
    preview: { background: '0 10% 6%', primary: '0 100% 40%' } },
  { id: 'demon-slayer', name: '鬼灭之刃', category: 'style',
    preview: { background: '200 15% 10%', primary: '190 100% 45%' } },
  { id: 'naruto', name: '火影忍者', category: 'style',
    preview: { background: '30 15% 10%', primary: '35 100% 55%' } },
  { id: 'ponyo', name: '龙猫深海', category: 'style',
    preview: { background: '200 25% 15%', primary: '195 80% 50%' } },
  
  // Style themes - Festivals (8)
  { id: 'chinese-new-year', name: '新年', category: 'style',
    preview: { background: '0 20% 12%', primary: '0 90% 50%' } },
  { id: 'halloween', name: '万圣节', category: 'style',
    preview: { background: '270 15% 8%', primary: '30 100% 50%' } },
  { id: 'valentine', name: '情人节', category: 'style',
    preview: { background: '340 30% 12%', primary: '340 90% 55%' } },
  { id: 'christmas', name: '圣诞节', category: 'style',
    preview: { background: '140 20% 10%', primary: '0 85% 50%' } },
  { id: 'tanabata', name: '七夕', category: 'style',
    preview: { background: '220 30% 15%', primary: '340 80% 60%' } },
  { id: 'dragon-boat', name: '端午节', category: 'style',
    preview: { background: '140 25% 12%', primary: '140 80% 45%' } },
  { id: 'mid-autumn', name: '中秋节', category: 'style',
    preview: { background: '30 20% 10%', primary: '45 90% 55%' } },
  { id: 'gothic-lolita', name: '哥特萝莉', category: 'style',
    preview: { background: '270 25% 8%', primary: '280 100% 50%' } },
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