import { BREAKPOINTS, MOBILE_THRESHOLD } from '@/lib/breakpoints'
import { useMediaQuery } from './useMediaQuery'

export type Breakpoint = 'sm' | 'md' | 'lg' | 'xl'

/**
 * 返回当前窗口宽度对应的简化的 Tailwind 断点标签。
 *
 * 语义（与 BREAKPOINTS 常量对齐）：
 * - 'sm' : < 768px   （手机竖屏 / 小屏移动端）
 * - 'md' : 768-1023px（平板竖屏 / 小笔记本）
 * - 'lg' : 1024-1279px（平板横屏 / 标准桌面）
 * - 'xl' : >= 1280px （宽屏桌面）
 */
export function useBreakpoint(): Breakpoint {
  const isXl = useMediaQuery(`(min-width: ${BREAKPOINTS.xl}px)`)
  const isLg = useMediaQuery(`(min-width: ${BREAKPOINTS.lg}px)`)
  const isMd = useMediaQuery(`(min-width: ${BREAKPOINTS.md}px)`)

  if (isXl) return 'xl'
  if (isLg) return 'lg'
  if (isMd) return 'md'
  return 'sm'
}

/**
 * 检测是否为移动端（< 1024px）。与 AppLayout.tsx 保持一致。
 */
export function useIsMobile(): boolean {
  return !useMediaQuery(`(min-width: ${MOBILE_THRESHOLD}px)`)
}