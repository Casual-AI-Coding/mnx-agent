export interface TokenUsage {
  textTokens: number
  voiceCharacters: number
  imageRequests: number
  musicRequests: number
  videoRequests: number
  lastUpdated: string
  manualBalance?: number
}

export interface UsageHistory {
  date: string
  textTokens: number
  voiceCharacters: number
  imageRequests: number
  musicRequests: number
  videoRequests: number
}

export interface UsageStats {
  total: TokenUsage
  history: UsageHistory[]
  dailyAverage: {
    textTokens: number
    voiceCharacters: number
    imageRequests: number
    musicRequests: number
    videoRequests: number
  }
}