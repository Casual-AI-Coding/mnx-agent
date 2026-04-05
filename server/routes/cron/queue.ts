import { Router } from 'express'
import { validate, validateQuery, validateParams } from '../../middleware/validate'
import { asyncHandler } from '../../middleware/asyncHandler'
import { successResponse, errorResponse, deletedResponse } from '../../middleware/api-response'
import { getDatabase } from '../../database/service-async.js'
import {
  createTaskSchema,
  updateTaskSchema,
  taskIdParamsSchema,
  taskQueueQuerySchema,
} from '../../validation/cron-schemas'
import { TaskStatus } from '../../database/types'
import { buildOwnerFilter, getOwnerIdForInsert } from '../../middleware/data-isolation.js'
import { parsePayload } from './utils'

const router = Router()

router.get('/queue', validateQuery(taskQueueQuerySchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const query = req.query as unknown as { status?: TaskStatus; job_id?: string; page: number; limit: number }
  const { status, job_id, page, limit } = query
  const offset = (page - 1) * limit
  const result = await db.getAllTasks({ status, ownerId, jobId: job_id, limit, offset })
  successResponse(res, { tasks: result.tasks, total: result.total, page, limit })
}))

router.post('/queue', validate(createTaskSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = getOwnerIdForInsert(req) ?? undefined
  const taskData = req.body
  const task = await db.createTask({
    job_id: taskData.job_id,
    task_type: taskData.task_type,
    payload: parsePayload(taskData.payload),
    priority: taskData.priority,
    max_retries: taskData.max_retries,
    status: TaskStatus.PENDING,
  }, ownerId)
  successResponse(res, task)
}))

router.put('/queue/:id', validateParams(taskIdParamsSchema), validate(updateTaskSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const task = await db.getTaskById(req.params.id, ownerId)
  if (!task) {
    errorResponse(res, 'Task not found', 404)
    return
  }
  const updates: { status?: TaskStatus; error_message?: string | null; result?: string | null } = {}
  if (req.body.status) updates.status = req.body.status as TaskStatus
  if (req.body.error_message) updates.error_message = req.body.error_message
  if (req.body.result) updates.result = req.body.result
  const updatedTask = await db.updateTask(req.params.id, updates, ownerId)
  successResponse(res, updatedTask)
}))

router.delete('/queue/:id', validateParams(taskIdParamsSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const task = await db.getTaskById(req.params.id, ownerId)
  if (!task) {
    errorResponse(res, 'Task not found', 404)
    return
  }
  await db.deleteTask(req.params.id, ownerId)
  deletedResponse(res)
}))

router.post('/queue/:id/retry', validateParams(taskIdParamsSchema), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const task = await db.getTaskById(req.params.id, ownerId)
  if (!task) {
    errorResponse(res, 'Task not found', 404)
    return
  }
  if (task.status !== TaskStatus.FAILED) {
    errorResponse(res, 'Only failed tasks can be retried', 400)
    return
  }
  const updatedTask = await db.updateTask(req.params.id, {
    status: TaskStatus.PENDING,
    retry_count: 0,
    error_message: null,
  }, ownerId)
  successResponse(res, updatedTask)
}))

router.get('/dlq', asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50
  const items = await db.getDeadLetterQueueItems(ownerId, limit)
  successResponse(res, { items, total: items.length })
}))

router.post('/dlq/:id/retry', asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const item = await db.getDeadLetterQueueItemById(req.params.id, ownerId)
  if (!item) {
    errorResponse(res, 'DLQ item not found', 404)
    return
  }
  const taskId = await db.retryDeadLetterQueueItem(req.params.id, ownerId)
  successResponse(res, { taskId, message: 'Task retried successfully' })
}))

router.delete('/dlq/:id', asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const ownerId = buildOwnerFilter(req).params[0]
  const item = await db.getDeadLetterQueueItemById(req.params.id, ownerId)
  if (!item) {
    errorResponse(res, 'DLQ item not found', 404)
    return
  }
  await db.updateDeadLetterQueueItem(req.params.id, {
    resolved_at: new Date().toISOString(),
    resolution: 'deleted',
  }, ownerId)
  successResponse(res, { deleted: true })
}))

export default router
