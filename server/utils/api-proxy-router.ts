import { Router, Request, Response } from 'express'
import { asyncHandler } from '../middleware/asyncHandler'
import { successResponse } from '../middleware/api-response'

interface ApiProxyConfig {
  endpoint: string
  clientMethod: string
  buildRequestBody: (req: Request) => unknown
  extractClient?: (req: Request) => unknown
  extractData?: (result: unknown) => unknown
}

/**
 * Factory for creating API proxy routers.
 * Eliminates duplicate patterns across text/voice/image/music/video routes.
 *
 * @example
 * const router = createApiProxyRouter({
 *   endpoint: '/generate',
 *   clientMethod: 'textGeneration',
 *   buildRequestBody: (req) => ({
 *     model: req.body.model,
 *     prompt: req.body.prompt
 *   })
 * })
 */
export function createApiProxyRouter(config: ApiProxyConfig): Router {
  const router = Router()

  router.post(
    config.endpoint,
    asyncHandler(async (req: Request, res: Response) => {
      const client = config.extractClient?.(req)
      if (!client) {
        throw new Error('extractClient is required for createApiProxyRouter')
      }
      const requestBody = config.buildRequestBody(req)

      const method = (client as any)[config.clientMethod]
      if (typeof method !== 'function') {
        throw new Error(`Invalid client method: ${config.clientMethod}`)
      }

      const result = await method.call(client, requestBody)
      const data = config.extractData ? config.extractData(result) : (result as any)?.data
      successResponse(res, data)
    })
  )

  return router
}