import { useAppStore, type ApiMode, PROXY_BASE_URL } from '@/stores/app'
import { API_HOSTS } from '@/types'

/**
 * Get the base URL based on API mode:
 * - 'direct': Returns MiniMax API host directly
 * - 'proxy': Returns local backend proxy URL ('/api')
 */
export function getBaseUrl(): string {
  const { region, apiMode } = useAppStore.getState()
  
  if (apiMode === 'proxy') {
    return PROXY_BASE_URL
  }
  
  return API_HOSTS[region]
}

/**
 * Get headers for API requests
 * In direct mode: includes Authorization with API key
 * In proxy mode: API key is handled by backend, headers are simpler
 */
export function getHeaders(): HeadersInit {
  const { apiKey, apiMode, region } = useAppStore.getState()
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }
  
  if (apiMode === 'direct') {
    if (apiKey && apiKey.trim()) {
      headers['Authorization'] = `Bearer ${apiKey.trim()}`
    }
  } else {
    if (apiKey && apiKey.trim()) {
      headers['X-API-Key'] = apiKey.trim()
    }
    headers['X-Region'] = region === 'cn' ? 'cn' : 'intl'
  }
  
  return headers
}

/**
 * Get API mode description for UI display
 */
export function getApiModeLabel(mode: ApiMode): string {
  return mode === 'direct' ? '直连' : '代理'
}

export function getApiMode(): ApiMode {
  return useAppStore.getState().apiMode
}

export function getApiModeDescription(mode: ApiMode): string {
  return mode === 'direct' 
    ? '直接调用 MiniMax API' 
    : '通过本地后端代理调用'
}