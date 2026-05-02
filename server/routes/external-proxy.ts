import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../middleware/asyncHandler'
import { successResponse, errorResponse } from '../middleware/api-response'
import { getLogger } from '../lib/logger'
import { EXTERNAL_PROXY_TIMEOUTS } from '../config/timeouts'
import { ExternalApiLogRepository } from '../repositories/external-api-log.repository'
import { MediaRepository } from '../repositories/media-repository'
import { getConnection } from '../database/connection'
import { saveMediaFile } from '../lib/media-storage'
import type { MediaType } from '../database/types'

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

const submitTaskSchema = z.object({
  url: z.string().url(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('POST'),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.unknown().optional(),
  service_provider: z.string(),
  operation: z.string(),
  media_type: z.enum(['image', 'video', 'audio', 'music']).optional(),
})

router.post(
  '/submit',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = submitTaskSchema.safeParse(req.body)
    if (!parsed.success) {
      errorResponse(res, `请求参数无效: ${parsed.error.issues.map(i => i.message).join(', ')}`, 400)
      return
    }

    const { url, method, headers, body, service_provider, operation, media_type } = parsed.data

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

    const conn = await getConnection()
    const repo = new ExternalApiLogRepository(conn)

    const maxConcurrentTasks = 3
    const activeTaskCount = await repo.getActiveTaskCount(req.user?.userId ?? '')
    if (activeTaskCount >= maxConcurrentTasks) {
      errorResponse(res, `当前有 ${activeTaskCount} 个任务进行中，请稍后再试`, 429)
      return
    }

    const log = await repo.create({
      service_provider,
      api_endpoint: url,
      operation,
      request_params: body as Record<string, unknown>,
      request_body: JSON.stringify(body),
      status: 'pending',
      task_status: 'pending',
      user_id: req.user?.userId,
    })

    executeAsyncTask(log.id, url, method, headers, body, media_type).catch(err => {
      logger.error({
        msg: 'Async task execution failed',
        taskId: log.id,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    })

    successResponse(res, {
      taskId: log.id,
      status: 'pending',
      message: '任务已提交，请轮询查询状态',
    })
  })
)

router.get(
  '/status/:taskId',
  asyncHandler(async (req: Request, res: Response) => {
    const taskId = req.params.taskId
    if (!taskId) {
      errorResponse(res, '缺少任务 ID', 400)
      return
    }

    const conn = await getConnection()
    const repo = new ExternalApiLogRepository(conn)
    const log = await repo.getById(taskId)

    if (!log) {
      errorResponse(res, '任务不存在', 404)
      return
    }

    if (log.user_id && log.user_id !== req.user?.userId) {
      errorResponse(res, '无权访问此任务', 403)
      return
    }

    successResponse(res, {
      taskId: log.id,
      task_status: log.task_status,
      status: log.status,
      result_media_id: log.result_media_id,
      result_data: log.result_data,
      error_message: log.error_message,
      created_at: log.created_at,
    })
  })
)

async function executeAsyncTask(
  logId: number,
  url: string,
  method: string,
  headers?: Record<string, string>,
  body?: unknown,
  mediaType?: string
): Promise<void> {
  const conn = await getConnection()
  const repo = new ExternalApiLogRepository(conn)
  const startTime = performance.now()

  logger.info({
    msg: 'Async task started',
    logId,
    url,
    method,
  })

  try {
    await repo.updateResult(String(logId), {
      task_status: 'processing',
    })

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

    const isSuccess = response.status >= 200 && response.status < 300

    let resultMediaId: string | null = null
    if (isSuccess && mediaType && responseBody && typeof responseBody === 'object') {
      const data = responseBody as Record<string, unknown>
      const imageUrl = extractImageUrl(data)
      if (imageUrl) {
        try {
          const arrayBuffer = await fetch(imageUrl).then(r => r.arrayBuffer())
          const result = await saveMediaFile(
            Buffer.from(new Uint8Array(arrayBuffer)),
            `openai-image-${logId}.png`,
            mediaType as MediaType
          )
          const mediaRepo = new MediaRepository(conn)
          const mediaRecord = await mediaRepo.create({
            filename: result.filename,
            original_name: `openai-image-${logId}.png`,
            filepath: result.filepath,
            type: mediaType as MediaType,
            mime_type: 'image/png',
            size_bytes: result.size_bytes,
            source: 'external_debug',
          })
          resultMediaId = mediaRecord.id
        } catch (saveErr) {
          logger.error({
            msg: 'Failed to save media from URL',
            logId,
            error: saveErr instanceof Error ? saveErr.message : 'Unknown error',
          })
        }
      }
    }

    await repo.updateResult(String(logId), {
      response_body: JSON.stringify(responseBody),
      status: isSuccess ? 'success' : 'failed',
      error_message: isSuccess ? undefined : `HTTP ${response.status}`,
      duration_ms: durationMs,
      task_status: isSuccess ? 'completed' : 'failed',
      result_media_id: resultMediaId,
      result_data: responseBody as Record<string, unknown>,
    })

    logger.info({
      msg: 'Async task completed',
      logId,
      status: isSuccess ? 'success' : 'failed',
      durationMs,
    })
  } catch (err) {
    const durationMs = Math.round(performance.now() - startTime)
    const message = err instanceof Error ? err.message : '代理请求失败'

    try {
      await repo.updateResult(String(logId), {
        status: 'failed',
        error_message: message,
        duration_ms: durationMs,
        task_status: 'failed',
      })
    } catch (updateErr) {
      logger.error({
        msg: 'Failed to update task status',
        logId,
        error: updateErr instanceof Error ? updateErr.message : 'Unknown error',
      })
    }

    logger.error({
      msg: 'Async task failed',
      logId,
      error: message,
      durationMs,
    })
  }
}

function extractImageUrl(data: Record<string, unknown>): string | null {
  if (Array.isArray(data.data) && data.data.length > 0) {
    const firstItem = data.data[0] as Record<string, unknown>
    if (typeof firstItem.url === 'string') {
      return firstItem.url
    }
    if (typeof firstItem.b64_json === 'string') {
      return null
    }
  }
  return null
}

export default router
