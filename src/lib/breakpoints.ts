/**
 * Tailwind 断点常量，与 tailwind.config.js 默认 screens 对齐。
 * 用于 useBreakpoint / useIsMobile 等响应式 hooks。
 */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const

export type BreakpointKey = keyof typeof BREAKPOINTS

/**
 * 移动端阈值：低于此宽度视为移动端布局。
 * 与 AppLayout.tsx 中 `window.matchMedia('(min-width: 1024px)')` 保持一致。
 */
export const MOBILE_THRESHOLD = BREAKPOINTS.lg // 1024px