/**
 * API Client 依赖注入接口
 *
 * 解耦 InternalAPIClient 对 Zustand store 和浏览器 API 的硬依赖,
 * 使其可测试、可替换、可组合。
 */

/** 认证信息提供者 — 替代 useAuthStore 直接耦合 */
export interface AuthProvider {
  /** 是否已完成 hydration */
  isHydrated(): boolean
  /** 是否已认证 */
  isAuthenticated(): boolean
  /** 当前 access token */
  getAccessToken(): string | null
  /** 更新 access token */
  updateAccessToken(token: string): void
  /** 登出 */
  logout(): void
}

/** API 设置提供者 — 替代 useSettingsStore 直接耦合 */
export interface SettingsProvider {
  /** 获取 MiniMax API Key */
  getApiKey(): string
  /** 获取区域 (domestic/international) */
  getRegion(): 'domestic' | 'international'
}

/** 导航提供者 — 替代 window.location.href 硬编码 */
export interface NavigationProvider {
  /** 跳转到登录页 */
  redirectToLogin(): void
}
