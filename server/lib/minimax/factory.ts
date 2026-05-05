import { getLogger } from '../logger.js'
import { MiniMaxClient } from './client.js'
import { MockMiniMaxClient } from './mock-client.js'
import type { Region } from './types.js'

const logger = getLogger()

let clientInstance: MiniMaxClient | null = null

export function getMiniMaxClient(): MiniMaxClient {
  if (!clientInstance) {
    const apiKey = process.env.MINIMAX_API_KEY
    if (!apiKey) {
      logger.warn('[MiniMaxClient] MINIMAX_API_KEY not configured, using mock client that will fail on API calls')
      clientInstance = new MockMiniMaxClient()
    } else {
      const envRegion = process.env.MINIMAX_REGION
      const region: Region = envRegion === 'cn' ? 'domestic' : 'international'
      clientInstance = new MiniMaxClient(apiKey, region)
    }
  }
  return clientInstance
}

export function createMiniMaxClientFromHeaders(apiKey: string, region?: string): MiniMaxClient {
  if (!apiKey) {
    throw new Error('API key is required')
  }
  const regionValue: Region = region === 'cn' ? 'domestic' : 'international'
  return new MiniMaxClient(apiKey, regionValue)
}

export function resetMiniMaxClient(): void {
  clientInstance = null
}
