export type ThemeSetting = 'system' | string
export type ToastPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
export type UIDensity = 'compact' | 'comfortable' | 'spacious'
export type FontSize = 'small' | 'medium' | 'large'

export interface UISettings {
  theme: ThemeSetting
  sidebarCollapsed: boolean
  sidebarWidth: number
  showAnimations: boolean
  reducedMotion: boolean
  toastPosition: ToastPosition
  density: UIDensity
  fontSize: FontSize
}
