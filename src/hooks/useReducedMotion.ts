import { useMediaQuery } from './useMediaQuery'

/**
 * 检测用户是否启用了 prefers-reduced-motion 设置。
 * 用于在移动端抽屉动画、页面切换动画等场景中降低动画强度。
 *
 * @returns boolean - true 表示用户偏好减少动画
 */
export function useReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}