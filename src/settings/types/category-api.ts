export interface ApiSettings {
  minimaxKey: string
  region: 'cn' | 'intl'
  mode: 'direct' | 'proxy'
  timeout: number
  retryAttempts: number
  retryDelay: number
}
