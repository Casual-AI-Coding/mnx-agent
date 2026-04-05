export {
  THEME_REGISTRY,
  getThemeById,
  getThemesByCategory,
  getDefaultThemeForCategory,
} from './registry'
export type { ThemeMeta, ThemeCategory } from './registry'

// Design Tokens (Legacy - hardcoded Tailwind classes)
// @deprecated Use semantic tokens from './tokens/index' instead
export {
  primary,
  primaryText,
  secondary,
  secondaryText,
  neutral,
  neutralText,
  neutralBorder,
  status as legacyStatus,
  roles as legacyRoles,
  taskStatus as legacyTaskStatus,
  services as legacyServices,
  spacing,
  padding,
  margin,
  fontSize,
  fontWeight,
  radius,
  shadow,
  transition,
  composite,
  combineTokens,
  getRoleColors,
  getStatusColors,
  getServiceColors,
} from './tokens'
export type { StatusColorSet, RoleColorSet } from './tokens'

// Semantic Tokens (Theme-Aware) - RECOMMENDED
export * from './tokens/index'