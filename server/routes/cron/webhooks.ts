import { Router } from 'express'
import { validate, validateQuery, validateParams } from '../../middleware/validate'
import { asyncHandler } from '../../middleware/asyncHandler'
import { successResponse, errorResponse } from '../../middleware/api-response'
import { getDatabaseService, getWebhookService, getNotificationServiceInstance } from '../../service-registration.js'
import {
  createWebhookSchema,
  updateWebhookSchema,
  webhookIdParamsSchema,
  webhookDeliveriesQuerySchema,
} from '../../validation/cron-schemas'
import { WebhookConfig } from '../../database/types'
import { buildOwnerFilter, getOwnerIdForInsert } from '../../middleware/data-isolation.js'
import { withEntityNotFound } from '../../utils/index.js'

const router = Router()

router.get('/webhooks', asyncHandler(async (req, res) => {
  const webhookService = getWebhookService()
  const ownerId = buildOwnerFilter(req).params[0]
  const webhooks: WebhookConfig[] = await webhookService.getAll(ownerId)
  successResponse(res, { webhooks, total: webhooks.length })
}))

router.post('/webhooks', validate(createWebhookSchema), asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const webhookService = getWebhookService()
  const ownerId = getOwnerIdForInsert(req) ?? undefined
  const webhookData = req.body

  const job = await db.getCronJobById(webhookData.job_id, ownerId)
  if (!withEntityNotFound(job, res, 'Job')) return

  const webhook = await webhookService.create({
    job_id: webhookData.job_id,
    name: webhookData.name,
    url: webhookData.url,
    events: webhookData.events,
    headers: webhookData.headers,
    secret: webhookData.secret,
    is_active: webhookData.is_active,
  }, ownerId)

  successResponse(res, webhook, 201)
}))

router.get('/webhooks/:id', validateParams(webhookIdParamsSchema), asyncHandler(async (req, res) => {
  const webhookService = getWebhookService()
  const ownerId = buildOwnerFilter(req).params[0]
  const webhook = await webhookService.getById(req.params.id, ownerId)
  if (!withEntityNotFound(webhook, res, 'Webhook')) return
  successResponse(res, webhook)
}))

router.patch('/webhooks/:id', validateParams(webhookIdParamsSchema), validate(updateWebhookSchema), asyncHandler(async (req, res) => {
  const webhookService = getWebhookService()
  const ownerId = buildOwnerFilter(req).params[0]
  const existing = await webhookService.getById(req.params.id, ownerId)
  if (!existing) {
    errorResponse(res, 'Webhook not found', 404)
    return
  }
  const webhook = await webhookService.update(req.params.id, req.body, ownerId)
  successResponse(res, webhook)
}))

router.delete('/webhooks/:id', validateParams(webhookIdParamsSchema), asyncHandler(async (req, res) => {
  const webhookService = getWebhookService()
  const ownerId = buildOwnerFilter(req).params[0]
  const existing = await webhookService.getById(req.params.id, ownerId)
  if (!existing) {
    errorResponse(res, 'Webhook not found', 404)
    return
  }
  await webhookService.delete(req.params.id, ownerId)
  successResponse(res, { deleted: true })
}))

router.post('/webhooks/:id/test', validateParams(webhookIdParamsSchema), asyncHandler(async (req, res) => {
  const webhookService = getWebhookService()
  const notificationService = getNotificationServiceInstance()
  const ownerId = buildOwnerFilter(req).params[0]
  const webhook = await webhookService.getById(req.params.id, ownerId)
  if (!withEntityNotFound(webhook, res, 'Webhook')) return
  const result = await notificationService.testWebhook(req.params.id)
  res.json({ success: result.success, data: result })
}))

router.get('/webhooks/:id/deliveries', validateParams(webhookIdParamsSchema), validateQuery(webhookDeliveriesQuerySchema), asyncHandler(async (req, res) => {
  const webhookService = getWebhookService()
  const ownerId = buildOwnerFilter(req).params[0]
  const webhook = await webhookService.getById(req.params.id, ownerId)
  if (!withEntityNotFound(webhook, res, 'Webhook')) return
  const query = req.query as unknown as { limit: number }
  const deliveries = await webhookService.getDeliveries(req.params.id, query.limit, ownerId)
  successResponse(res, { deliveries, total: deliveries.length })
}))

export default router
