export {
  THEME_REGISTRY,
  getThemeById,
  getThemesByCategory,
  getDefaultThemeForCategory,
} from './registry'
export type { ThemeMeta, ThemeCategory } from './registry'

// Semantic Tokens (Theme-Aware) - RECOMMENDED
export * from './tokens/index'