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

    executeAsyncTask(log.id, url, method, headers, body, media_type, req.user?.userId).catch(err => {
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
  mediaType?: string,
  userId?: string
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
      const images = extractAllImages(data)

      let firstMediaId: string | null = null
      for (const [index, imageInfo] of images.entries()) {
        let imageBuffer: Buffer | null = null

        if (imageInfo.url) {
          try {
            const arrayBuffer = await fetch(imageInfo.url).then(r => r.arrayBuffer())
            imageBuffer = Buffer.from(new Uint8Array(arrayBuffer))
          } catch (fetchErr) {
            logger.error({
              msg: 'Failed to fetch image from URL',
              logId,
              index,
              error: fetchErr instanceof Error ? fetchErr.message : 'Unknown error',
            })
          }
        } else if (imageInfo.base64) {
          imageBuffer = Buffer.from(imageInfo.base64, 'base64')
        }

        if (imageBuffer) {
          try {
            const ext = detectImageExtension(imageBuffer)
            const filename = images.length > 1
              ? `openai-image-${logId}-${index + 1}.${ext}`
              : `openai-image-${logId}.${ext}`
            const result = await saveMediaFile(imageBuffer, filename, mediaType as MediaType)
            const mediaRepo = new MediaRepository(conn)
            const mediaRecord = await mediaRepo.create(
              {
                filename: result.filename,
                original_name: filename,
                filepath: result.filepath,
                type: mediaType as MediaType,
                mime_type: `image/${ext}`,
                size_bytes: result.size_bytes,
                source: 'external_debug',
              },
              userId
            )
            if (firstMediaId === null) {
              firstMediaId = mediaRecord.id
            }
          } catch (saveErr) {
            logger.error({
              msg: 'Failed to save media',
              logId,
              index,
              error: saveErr instanceof Error ? saveErr.message : 'Unknown error',
            })
          }
        }
      }
      resultMediaId = firstMediaId
    }

    const errorMessage = isSuccess
      ? undefined
      : extractErrorMessage(responseBody, response.status)

    const cleanedBody = stripBase64Images(responseBody)
    await repo.updateResult(String(logId), {
      response_body: JSON.stringify(cleanedBody),
      status: isSuccess ? 'success' : 'failed',
      error_message: errorMessage,
      duration_ms: durationMs,
      task_status: isSuccess ? 'completed' : 'failed',
      result_media_id: resultMediaId,
      result_data: cleanedBody as Record<string, unknown>,
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

function extractAllImages(data: Record<string, unknown>): Array<{ url?: string; base64?: string }> {
  const images: Array<{ url?: string; base64?: string }> = []
  if (Array.isArray(data.data)) {
    for (const item of data.data) {
      if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>
        const url = typeof record.url === 'string' ? record.url : undefined
        const base64 = typeof record.b64_json === 'string' ? record.b64_json : undefined
        if (url || base64) {
          images.push({ url, base64 })
        }
      }
    }
  }
  return images
}

function stripBase64Images(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body
  const data = { ...(body as Record<string, unknown>) }
  if (Array.isArray(data.data)) {
    data.data = (data.data as unknown[]).map((item) => {
      if (item && typeof item === 'object' && 'b64_json' in (item as Record<string, unknown>)) {
        const cleaned = { ...(item as Record<string, unknown>) }
        delete cleaned.b64_json
        return cleaned
      }
      return item
    })
  }
  return data
}

function detectImageExtension(buffer: Buffer): string {
  if (buffer.length >= 4) {
    // PNG: 89 50 4E 47
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return 'png'
    // JPEG: FF D8 FF
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return 'jpeg'
    // WebP: RIFF....WEBP
    if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
        buffer.length >= 12 && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) return 'webp'
  }
  return 'png'
}

function extractErrorMessage(responseBody: unknown, httpStatus: number): string {
  if (responseBody && typeof responseBody === 'object') {
    const body = responseBody as Record<string, unknown>
    // OpenAI 格式: { error: { message: "...", type: "..." } }
    if (body.error && typeof body.error === 'object') {
      const error = body.error as Record<string, unknown>
      if (typeof error.message === 'string') return error.message
    }
    // MiniMax 格式: { base_resp: { status_msg: "...", status_code: N } }
    if (body.base_resp && typeof body.base_resp === 'object') {
      const baseResp = body.base_resp as Record<string, unknown>
      if (typeof baseResp.status_msg === 'string') return baseResp.status_msg
    }
    // 通用格式: { error: "..." }
    if (typeof body.error === 'string') return body.error
    // 通用格式: { message: "..." }
    if (typeof body.message === 'string') return body.message
  }
  return `HTTP ${httpStatus}`
}

export default router
