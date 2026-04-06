import { Request } from 'express'
import { MiniMaxClient, getMiniMaxClient, createMiniMaxClientFromHeaders } from './minimax.js'
import type { DatabaseService } from '../database/service-async.js'

export interface MiniMaxClientOptions {
  apiKey?: string
  region?: 'domestic' | 'international'
}

export class MiniMaxClientFactory {
  private defaultClient: MiniMaxClient | null = null
  private db: DatabaseService | null = null

  setDatabase(db: DatabaseService): void {
    this.db = db
  }

  getDefaultClient(): MiniMaxClient {
    if (!this.defaultClient) {
      this.defaultClient = getMiniMaxClient()
    }
    return this.defaultClient
  }

  createClient(options: MiniMaxClientOptions): MiniMaxClient {
    const { apiKey, region } = options

    if (apiKey && apiKey.trim().length > 0) {
      return createMiniMaxClientFromHeaders(apiKey.trim(), region)
    }

    return this.getDefaultClient()
  }

  getClientFromRequest(req: Request): MiniMaxClient {
    const apiKey = req.headers['x-api-key'] as string | undefined
    const region = req.headers['x-region'] as 'domestic' | 'international' | undefined

    return this.createClient({ apiKey, region })
  }

  async getClientForUser(userId: string): Promise<MiniMaxClient> {
    return this.getDefaultClient()
  }

  reset(): void {
    this.defaultClient = null
  }
}

let factoryInstance: MiniMaxClientFactory | null = null

export function getMiniMaxClientFactory(): MiniMaxClientFactory {
  if (!factoryInstance) {
    factoryInstance = new MiniMaxClientFactory()
  }
  return factoryInstance
}

export function resetMiniMaxClientFactory(): void {
  if (factoryInstance) {
    factoryInstance.reset()
  }
  factoryInstance = null
}

export function getClientFromRequest(req: Request): MiniMaxClient {
  return getMiniMaxClientFactory().getClientFromRequest(req)
}