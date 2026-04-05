import { Router, Request } from 'express'
import { asyncHandler } from '../../middleware/asyncHandler.js'
import { authenticateJWT } from '../../middleware/auth-middleware.js'
import { validate, validateQuery, validateParams } from '../../middleware/validate.js'
import { getConnection } from '../../database/connection.js'
import { SettingsService } from '../../services/settings-service.js'
import { successResponse, errorResponse } from '../../middleware/api-response'
import {
  settingsCategoryParamsSchema,
  settingsHistoryQuerySchema,
  updateSettingsSchema,
} from '../../validation/settings-validation.js'
import type { SettingsCategory } from '../../../src/settings/types/index.js'

const router = Router()

router.use(authenticateJWT)

router.get('/', asyncHandler(async (req: Request, res) => {
  const conn = getConnection()
  const settingsService = new SettingsService(conn)
  const userId = req.user!.userId

  const result = await settingsService.getAllSettings(userId)

  if (!result.success) {
    errorResponse(res, result.error, 400)
    return
  }

  successResponse(res, result.settings)
}))

router.get('/history', validateQuery(settingsHistoryQuerySchema), asyncHandler(async (req: Request, res) => {
  const conn = getConnection()
  const settingsService = new SettingsService(conn)
  const userId = req.user!.userId
  const { category, page, limit } = req.query as {
    category?: SettingsCategory
    page?: number
    limit?: number
  }

  const result = await settingsService.getSettingsHistory(userId, category, page, limit)

  successResponse(res, result)
}))

router.get('/defaults', asyncHandler(async (req: Request, res) => {
  const conn = getConnection()
  const settingsService = new SettingsService(conn)

  const defaults = {
    account: settingsService.getDefaults('account'),
    api: settingsService.getDefaults('api'),
    ui: settingsService.getDefaults('ui'),
    generation: settingsService.getDefaults('generation'),
    cron: settingsService.getDefaults('cron'),
    workflow: settingsService.getDefaults('workflow'),
    notification: settingsService.getDefaults('notification'),
    media: settingsService.getDefaults('media'),
    privacy: settingsService.getDefaults('privacy'),
    accessibility: settingsService.getDefaults('accessibility'),
  }

  successResponse(res, defaults)
}))

router.get('/:category', validateParams(settingsCategoryParamsSchema), asyncHandler(async (req: Request, res) => {
  const conn = getConnection()
  const settingsService = new SettingsService(conn)
  const userId = req.user!.userId
  const category = req.params.category as SettingsCategory

  const settings = await settingsService.getSettingsByCategory(userId, category)

  successResponse(res, settings)
}))

router.patch('/:category', validateParams(settingsCategoryParamsSchema), validate(updateSettingsSchema), asyncHandler(async (req: Request, res) => {
  const conn = getConnection()
  const settingsService = new SettingsService(conn)
  const userId = req.user!.userId
  const category = req.params.category as SettingsCategory
  const { settings } = req.body

  const result = await settingsService.updateSettings(
    userId,
    category,
    settings,
    userId,
    'user',
    req.ip,
    req.get('user-agent')
  )

  if (!result.success) {
    errorResponse(res, result.error, 400)
    return
  }

  successResponse(res, {
    settings: result.settings,
    changedKeys: result.changedKeys,
  })
}))

router.put('/:category', validateParams(settingsCategoryParamsSchema), validate(updateSettingsSchema), asyncHandler(async (req: Request, res) => {
  const conn = getConnection()
  const settingsService = new SettingsService(conn)
  const userId = req.user!.userId
  const category = req.params.category as SettingsCategory
  const { settings } = req.body

  const result = await settingsService.updateSettings(
    userId,
    category,
    settings,
    userId,
    'user',
    req.ip,
    req.get('user-agent')
  )

  if (!result.success) {
    errorResponse(res, result.error, 400)
    return
  }

  successResponse(res, {
    settings: result.settings,
    changedKeys: result.changedKeys,
  })
}))

router.delete('/:category', validateParams(settingsCategoryParamsSchema), asyncHandler(async (req: Request, res) => {
  const conn = getConnection()
  const settingsService = new SettingsService(conn)
  const userId = req.user!.userId
  const category = req.params.category as SettingsCategory

  const defaults = await settingsService.resetCategory(userId, category, userId)

  successResponse(res, {
    message: 'Settings reset to defaults',
    defaults,
  })
}))

export default router