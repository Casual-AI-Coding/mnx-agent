import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../middleware/asyncHandler'
import { successResponse, errorResponse } from '../middleware/api-response'
import { getLogger } from '../lib/logger'
import { saveMediaFile } from '../lib/media-storage'
import {
  getExternalApiLogRepository,
  getMediaRepository,
  getSystemConfigService,
} from '../service-registration.js'
import { executeExternalProxyRequest } from './external-proxy/external-proxy-forward-helpers.js'
import { saveExternalProxyImages } from './external-proxy/external-proxy-media-save-helpers.js'
import { isExternalProxyUrlAllowed } from './external-proxy/external-proxy-url-security-helpers.js'
import { ensureExternalProxyAllowedHostsFresh } from '../services/external-proxy-allowed-hosts.service.js'
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

export function isUrlAllowed(urlString: string): boolean {
  return isExternalProxyUrlAllowed(urlString)
}

async function refreshAllowedHostsIfNeeded(): Promise<void> {
  await ensureExternalProxyAllowedHostsFresh({
    getSystemConfigByKey: (key: string) => getSystemConfigService().getByKey(key),
  })
}

const proxyRequestSchema = z.object({
  url: z.url(),
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

    await refreshAllowedHostsIfNeeded()
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
  url: z.url(),
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

    await refreshAllowedHostsIfNeeded()
    if (!isUrlAllowed(url)) {
      errorResponse(res, `不允许访问该域名: ${targetUrlResult.url.hostname}`, 403)
      return
    }

    const repo = getExternalApiLogRepository()

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

    const repo = getExternalApiLogRepository()
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
  const repo = getExternalApiLogRepository()
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
      const mediaRepo = getMediaRepository()
      resultMediaId = await saveExternalProxyImages({
        logId,
        images,
        mediaType,
        userId,
        isUrlAllowed,
        fetchImage: async imageUrl => fetch(imageUrl).then(response => response.arrayBuffer()),
        saveFile: saveMediaFile,
        createMediaRecord: (record, recordUserId) => mediaRepo.create(record, recordUserId),
        onRejectedUrl: ({ index, url: rejectedUrl }) => {
          logger.warn({
            msg: 'Rejected untrusted image URL (SSRF protection)',
            logId,
            index,
            url: rejectedUrl,
          })
        },
        onFetchError: ({ index, url: failedUrl, error }) => {
          logger.error({
            msg: 'Failed to fetch image from URL',
            logId,
            index,
            url: failedUrl,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        },
        onSaveError: ({ index, error }) => {
          logger.error({
            msg: 'Failed to save media',
            logId,
            index,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        },
      })
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

export default router
