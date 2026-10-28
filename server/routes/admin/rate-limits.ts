import { Router } from 'express'
import { z } from 'zod'

import { asyncHandler } from '../../middleware/asyncHandler.js'
import { successResponse, errorResponse } from '../../middleware/api-response.js'
import { requireRole } from '../../middleware/auth-middleware.js'
import { getSystemConfigService } from '../../service-registration.js'
import {
  RATE_LIMIT_OVERRIDES_CONFIG_KEY,
  configureRateLimitOverrides,
  ensureRateLimitsFresh,
  getEffectiveServiceRateLimits,
  resetRateLimitOverrides,
  validateRateLimitOverrides,
} from '../../config/rate-limits.js'

const router = Router()

router.use(requireRole(['super']))

const updateRateLimitsSchema = z.object({
  /** `service=rpm` 逗号分隔；空字符串表示清除全部覆盖，回退默认 */
  config: z.string().max(2_000),
})

function getOwnerId(req: import('express').Request): string | undefined {
  return req.user?.userId
}

/** 生效视图 + 静态默认值（管理界面展示） */
router.get('/', asyncHandler(async (req, res) => {
  await ensureRateLimitsFresh({
    getSystemConfigByKey: (key) => getSystemConfigService().getByKey(key),
  })

  successResponse(res, {
    services: getEffectiveServiceRateLimits(),
    defaults: Object.fromEntries(
      Object.entries(getEffectiveServiceRateLimits()).map(([k]) => [k, null])
    ),
    configKey: RATE_LIMIT_OVERRIDES_CONFIG_KEY,
    updatedBy: req.user?.username ?? null,
  })
}))

/** 更新服务 RPM 覆盖（写入 system_config 并即时生效） */
router.put('/', asyncHandler(async (req, res) => {
  const parsed = updateRateLimitsSchema.safeParse(req.body)
  if (!parsed.success) {
    errorResponse(res, '请求体格式错误：需要 { config: string }', 400)
    return
  }

  const validationError = validateRateLimitOverrides(parsed.data.config)
  if (validationError) {
    errorResponse(res, validationError, 400)
    return
  }

  const service = getSystemConfigService()
  const existing = await service.getByKey(RATE_LIMIT_OVERRIDES_CONFIG_KEY)
  if (existing) {
    await service.update(RATE_LIMIT_OVERRIDES_CONFIG_KEY, { value: parsed.data.config }, getOwnerId(req))
  } else {
    await service.create({
      key: RATE_LIMIT_OVERRIDES_CONFIG_KEY,
      value: parsed.data.config,
      description: '各服务 MiniMax API 速率限制覆盖（服务=rpm 逗号分隔；空值回退默认）',
      value_type: 'string',
    }, getOwnerId(req))
  }

  // 写入后立即生效（不走 TTL 等待）
  if (parsed.data.config.trim() === '') {
    resetRateLimitOverrides()
  } else {
    configureRateLimitOverrides(parsed.data.config)
  }

  successResponse(res, {
    services: getEffectiveServiceRateLimits(),
    configKey: RATE_LIMIT_OVERRIDES_CONFIG_KEY,
  })
}))

export default router
