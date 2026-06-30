import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../middleware/asyncHandler'
import { successResponse, errorResponse } from '../middleware/api-response'
import { getLogger } from '../lib/logger'
import { ExternalApiLogRepository } from '../repositories/external-api-log.repository'
import { MediaRepository } from '../repositories/media-repository'
import { getConnection } from '../database/connection'
import { saveMediaFile } from '../lib/media-storage'
import { executeExternalProxyRequest } from './external-proxy/external-proxy-forward-helpers.js'
import {
  EXTERNAL_PROXY_MEDIA_TYPES,
  isRecord,
} from './external-proxy/external-proxy-media-helpers.js'
import {
  extractAllImages,
  extractErrorMessage,
  stripBase64Images,
  toExternalProxyResultData,
} from './external-proxy/external-proxy-response-helpers.js'
import {
  getProxyErrorMessage,
  parseExternalProxyUrl,
} from './external-proxy/external-proxy-request-helpers.js'
import type { ExternalProxyMediaType } from './external-proxy/external-proxy-media-helpers.js'

const logger = getLogger()

const router = Router()

const ALLOWED_HOSTS = [
  'mikuapi.org',
  'api.pptoken.org',
  'code.azsheen.top',
  'api.tokenfty.net',
  'gpt.hslife.fun',
  'lumin-ai.tiandi.run',
  'api.sisyphusx.com',
]

export function isUrlAllowed(urlString: string): boolean {
  try {
    const url = new URL(urlString)
    const hostname = url.hostname.toLowerCase()

    // 阻止内部地址：
    // - 精确匹配：localhost、0.0.0.0 仅匹配自身（localhost.evil.com 是合法外部域名）
    // - 前缀匹配：127. 匹配所有 loopback IP；[::1]/::1 匹配 IPv6 loopback
    const blockedInternal = [
      { pattern: 'localhost', exact: true },
      { pattern: '127.', exact: false },
      { pattern: '0.0.0.0', exact: true },
      { pattern: '[::1]', exact: true },
      { pattern: '::1', exact: true },
    ]
    for (const { pattern, exact } of blockedInternal) {
      if (exact ? hostname === pattern : hostname.startsWith(pattern)) {
        return false
      }
    }

    // 白名单匹配 - 使用 wrapped-dot 防止子域名欺骗：
    // `.sub.api.sisyphusx.com`.endsWith(`.api.sisyphusx.com`) → true  ✅
    // `.api.sisyphusx.com.evil.com`.endsWith(`.api.sisyphusx.com`) → false ✅
    const wrappedHostname = `.${hostname}`
    return ALLOWED_HOSTS.some(h => wrappedHostname.endsWith(`.${h}`))
  } catch (error) {
    if (error instanceof Error) {
      return false
    }
    return false
  }
}

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

    const targetUrlResult = parseExternalProxyUrl(url)
    if (!targetUrlResult.ok) {
      errorResponse(res, targetUrlResult.error, 400)
      return
    }

    if (!isUrlAllowed(url)) {
      errorResponse(res, `不允许访问该域名: ${targetUrlResult.url.hostname}`, 403)
      return
    }

    const startTime = performance.now()
    try {
      const proxyResult = await executeExternalProxyRequest({
        url,
        method,
        headers,
        body,
      })

      logger.info({
        msg: 'External proxy request completed',
        url,
        method,
        status: proxyResult.status,
        durationMs: proxyResult.durationMs,
      })

      successResponse(res, {
        status: proxyResult.status,
        headers: proxyResult.headers,
        body: proxyResult.body,
      })
    } catch (err) {
      const durationMs = Math.round(performance.now() - startTime)
      const message = getProxyErrorMessage(err, '代理请求失败')

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
  media_type: z.enum(EXTERNAL_PROXY_MEDIA_TYPES).optional(),
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

    const targetUrlResult = parseExternalProxyUrl(url)
    if (!targetUrlResult.ok) {
      errorResponse(res, targetUrlResult.error, 400)
      return
    }

    if (!isUrlAllowed(url)) {
      errorResponse(res, `不允许访问该域名: ${targetUrlResult.url.hostname}`, 403)
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
      request_params: toExternalProxyResultData(body),
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
  mediaType?: ExternalProxyMediaType,
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

    const proxyResult = await executeExternalProxyRequest({
      url,
      method,
      headers,
      body,
    })

    const isSuccess = proxyResult.status >= 200 && proxyResult.status < 300

    let resultMediaId: string | null = null
    if (isSuccess && mediaType && isRecord(proxyResult.body)) {
      const images = extractAllImages(proxyResult.body)

      let firstMediaId: string | null = null
      for (const [index, imageInfo] of images.entries()) {
        let imageBuffer: Buffer | null = null

        if (imageInfo.url) {
          if (!isUrlAllowed(imageInfo.url)) {
            logger.warn({
              msg: 'Rejected untrusted image URL (SSRF protection)',
              logId,
              index,
              url: imageInfo.url,
            })
            continue
          }

          try {
            const arrayBuffer = await fetch(imageInfo.url).then(r => r.arrayBuffer())
            imageBuffer = Buffer.from(new Uint8Array(arrayBuffer))
          } catch (fetchErr) {
            logger.error({
              msg: 'Failed to fetch image from URL',
              logId,
              index,
              url: imageInfo.url,
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
            const result = await saveMediaFile(imageBuffer, filename, mediaType)
            const mediaRepo = new MediaRepository(conn)
            const mediaRecord = await mediaRepo.create(
              {
                filename: result.filename,
                original_name: filename,
                filepath: result.filepath,
                type: mediaType,
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
      : extractErrorMessage(proxyResult.body, proxyResult.status)

    const cleanedBody = stripBase64Images(proxyResult.body)
    await repo.updateResult(String(logId), {
      response_body: JSON.stringify(cleanedBody),
      status: isSuccess ? 'success' : 'failed',
      error_message: errorMessage,
      duration_ms: proxyResult.durationMs,
      task_status: isSuccess ? 'completed' : 'failed',
      result_media_id: resultMediaId,
      result_data: toExternalProxyResultData(cleanedBody),
    })

    logger.info({
      msg: 'Async task completed',
      logId,
      status: isSuccess ? 'success' : 'failed',
      durationMs: proxyResult.durationMs,
    })
  } catch (err) {
    const durationMs = Math.round(performance.now() - startTime)
    const message = getProxyErrorMessage(err, '代理请求失败')

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

export default router
