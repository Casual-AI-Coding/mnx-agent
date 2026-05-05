import type { AxiosError } from 'axios'
import { withExternalApiLog } from '../../services/external-api-audit.service.js'
import { MiniMaxClient } from './client.js'
import type { MiniMaxErrorResponse } from './types.js'

export async function getBalance(client: MiniMaxClient): Promise<unknown> {
  return withExternalApiLog(
    'minimax',
    'GET /v1/user/balance',
    'get_balance',
    async () => {
      try {
        const response = await client['client'].get('/v1/user/balance')
        return response.data
      } catch (error) {
        return MiniMaxClient.handleError(error as AxiosError<MiniMaxErrorResponse>)
      }
    }
  )()
}

export async function getCodingPlanRemains(client: MiniMaxClient, productId: string = '1001'): Promise<unknown> {
  return withExternalApiLog(
    'minimax',
    'GET /v1/api/openplatform/coding_plan/remains',
    'get_coding_plan_remains',
    async () => {
      try {
        const response = await client['client'].get('/v1/api/openplatform/coding_plan/remains', {
          headers: {
            'productId': productId,
          },
        })
        return response.data
      } catch (error) {
        return MiniMaxClient.handleError(error as AxiosError<MiniMaxErrorResponse>)
      }
    }
  )()
}

MiniMaxClient.prototype.getBalance = function (): Promise<unknown> {
  return getBalance(this)
}

MiniMaxClient.prototype.getCodingPlanRemains = function (productId: string = '1001'): Promise<unknown> {
  return getCodingPlanRemains(this, productId)
}

declare module './client.js' {
  interface MiniMaxClient {
    getBalance(): Promise<unknown>
    getCodingPlanRemains(productId?: string): Promise<unknown>
  }
}
