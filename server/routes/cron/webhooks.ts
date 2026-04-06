import { Router } from 'express'
import { validate, validateQuery, validateParams } from '../../middleware/validate'
import { asyncHandler } from '../../middleware/asyncHandler'
import { successResponse, errorResponse } from '../../middleware/api-response'
import { getDatabase } from '../../database/service-async.js'
import { getNotificationServiceInstance } from '../../service-registration.js'
import {
  createWebhookSchema,
  updateWebhookSchema,
  webhookIdParamsSchema,
  webhookDeliveriesQuerySchema,
} from '../../validation/cron-schemas'
import { WebhookConfig } from '../../database/types'
import { buildOwnerFilter, getOwnerIdForInsert } from '../../middleware/data-isolation.js'

const router = Router()

router.get('/webhooks', asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const webhooks: WebhookConfig[] = await db.getWebhookConfigsByOwner(ownerId)
  successResponse(res, { webhooks, total: webhooks.length })
}))

router.post('/webhooks', validate(createWebhookSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = getOwnerIdForInsert(req) ?? undefined
  const webhookData = req.body

  const job = await db.getCronJobById(webhookData.job_id, ownerId)
  if (!job) {
    errorResponse(res, 'Job not found', 404)
    return
  }

  const webhook = await db.createWebhookConfig({
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
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const webhook = await db.getWebhookConfigById(req.params.id, ownerId)
  if (!webhook) {
    errorResponse(res, 'Webhook not found', 404)
    return
  }
  successResponse(res, webhook)
}))

router.patch('/webhooks/:id', validateParams(webhookIdParamsSchema), validate(updateWebhookSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const existing = await db.getWebhookConfigById(req.params.id, ownerId)
  if (!existing) {
    errorResponse(res, 'Webhook not found', 404)
    return
  }
  const webhook = await db.updateWebhookConfig(req.params.id, req.body, ownerId)
  successResponse(res, webhook)
}))

router.delete('/webhooks/:id', validateParams(webhookIdParamsSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const existing = await db.getWebhookConfigById(req.params.id, ownerId)
  if (!existing) {
    errorResponse(res, 'Webhook not found', 404)
    return
  }
  await db.deleteWebhookConfig(req.params.id, ownerId)
  successResponse(res, { deleted: true })
}))

router.post('/webhooks/:id/test', validateParams(webhookIdParamsSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const notificationService = getNotificationServiceInstance()
  const ownerId = buildOwnerFilter(req).params[0]
  const webhook = await db.getWebhookConfigById(req.params.id, ownerId)
  if (!webhook) {
    errorResponse(res, 'Webhook not found', 404)
    return
  }
  const result = await notificationService.testWebhook(req.params.id)
  res.json({ success: result.success, data: result })
}))

router.get('/webhooks/:id/deliveries', validateParams(webhookIdParamsSchema), validateQuery(webhookDeliveriesQuerySchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const webhook = await db.getWebhookConfigById(req.params.id, ownerId)
  if (!webhook) {
    errorResponse(res, 'Webhook not found', 404)
    return
  }
  const query = req.query as unknown as { limit: number }
  const deliveries = await db.getWebhookDeliveriesByWebhook(req.params.id, query.limit, ownerId)
  successResponse(res, { deliveries, total: deliveries.length })
}))

export default router
