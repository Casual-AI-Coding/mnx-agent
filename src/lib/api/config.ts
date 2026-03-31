import { useAppStore, type ApiMode, PROXY_BASE_URL } from '@/stores/app'
import { API_HOSTS } from '@/types'

export function getBaseUrl(): string {
  const { region, apiMode } = useAppStore.getState()
  
  if (apiMode === 'proxy') {
    return PROXY_BASE_URL
  }
  
  return API_HOSTS[region]
}

export function getHeaders(): HeadersInit {
  const { apiKey, apiMode, region } = useAppStore.getState()
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }
  
  const cleanKey = apiKey?.trim() || ''
  const isAscii = /^[\x00-\x7F]*$/.test(cleanKey)
  
  if (apiMode === 'direct') {
    if (cleanKey && isAscii) {
      headers['Authorization'] = `Bearer ${cleanKey}`
    }
  } else {
    if (cleanKey && isAscii) {
      headers['X-API-Key'] = cleanKey
    }
    headers['X-Region'] = region === 'cn' ? 'cn' : 'intl'
  }
  
  return headers
}

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