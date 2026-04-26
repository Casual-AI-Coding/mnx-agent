import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../middleware/asyncHandler'
import { successResponse, errorResponse } from '../middleware/api-response'
import { getLogger } from '../lib/logger'
import { EXTERNAL_PROXY_TIMEOUTS } from '../config/timeouts'

const logger = getLogger()

const router = Router()

const ALLOWED_HOSTS = [
  'mikuapi.org',
  'api.pptoken.org',
  'code.azsheen.top',
  'api.tokenfty.net',
  'gpt.hslife.fun',
]

const proxyRequestSchema = z.object({
  url: z.string().url(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('POST'),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.unknown().optional(),
})

router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = proxyRequestSchema.safeParse(req.body)
    if (!parsed.success) {
      errorResponse(res, `请求参数无效: ${parsed.error.issues.map(i => i.message).join(', ')}`, 400)
      return
    }

    const { url, method, headers, body } = parsed.data

    let targetUrl: URL
    try {
      targetUrl = new URL(url)
    } catch {
      errorResponse(res, '无效的 URL', 400)
      return
    }

    if (!ALLOWED_HOSTS.includes(targetUrl.hostname)) {
      errorResponse(res, `不允许访问该域名: ${targetUrl.hostname}`, 403)
      return
    }

    const forwardHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (headers) {
      for (const [key, value] of Object.entries(headers)) {
        if (key.toLowerCase() !== 'host') {
          forwardHeaders[key] = value
        }
      }
    }

    const startTime = performance.now()
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), EXTERNAL_PROXY_TIMEOUTS.PROXY_REQUEST_MS)
      const response = await fetch(url, {
        method,
        headers: forwardHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      const durationMs = Math.round(performance.now() - startTime)

      const responseText = await response.text()
      let responseBody: unknown
      try {
        responseBody = JSON.parse(responseText)
      } catch {
        responseBody = responseText
      }

      const responseHeaders: Record<string, string> = {}
      response.headers.forEach((value, key) => {
        if (!['transfer-encoding', 'content-encoding', 'connection'].includes(key.toLowerCase())) {
          responseHeaders[key] = value
        }
      })

      logger.info({
        msg: 'External proxy request completed',
        url,
        method,
        status: response.status,
        durationMs,
      })

      successResponse(res, {
        status: response.status,
        headers: responseHeaders,
        body: responseBody,
      })
    } catch (err) {
      const durationMs = Math.round(performance.now() - startTime)
      const message = err instanceof Error ? err.message : '代理请求失败'

      logger.error({
        msg: 'External proxy request failed',
        url,
        method,
        error: message,
        durationMs,
      })

      errorResponse(res, `代理请求失败: ${message}`, 502)
    }
  })
)

export default router
