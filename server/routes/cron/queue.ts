import { Router } from 'express'
import { validate, validateQuery, validateParams } from '../../middleware/validate'
import { asyncHandler } from '../../middleware/asyncHandler'
import { successResponse, errorResponse, deletedResponse } from '../../middleware/api-response'
import { getDatabaseService } from '../../service-registration.js'
import { TaskService } from '../../services/domain/task.service.js'
import {
  createTaskSchema,
  updateTaskSchema,
  taskIdParamsSchema,
  taskQueueQuerySchema,
} from '../../validation/cron-schemas'
import { TaskStatus } from '../../database/types'
import { buildOwnerFilter, getOwnerIdForInsert } from '../../middleware/data-isolation.js'
import { parsePayload } from './utils'
import { withEntityNotFound } from '../../utils/index.js'

const router = Router()

router.get('/queue', validateQuery(taskQueueQuerySchema), asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const taskService = new TaskService(db)
  const ownerId = buildOwnerFilter(req).params[0]
  const query = req.query as unknown as { status?: TaskStatus; job_id?: string; page: number; limit: number }
  const { status, job_id, page, limit } = query
  const offset = (page - 1) * limit
  const result = await taskService.getAll({ status, ownerId, jobId: job_id, limit, offset })
  successResponse(res, { tasks: result.tasks, total: result.total, page, limit })
}))

router.post('/queue', validate(createTaskSchema), asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const taskService = new TaskService(db)
  const ownerId = getOwnerIdForInsert(req) ?? undefined
  const taskData = req.body
  const task = await taskService.create({
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
  const db = getDatabaseService()
  const taskService = new TaskService(db)
  const ownerId = buildOwnerFilter(req).params[0]
  const task = await taskService.getById(req.params.id, ownerId)
  if (!withEntityNotFound(task, res, 'Task')) return
  const updates: { status?: TaskStatus; error_message?: string | null; result?: string | null } = {}
  if (req.body.status) updates.status = req.body.status as TaskStatus
  if (req.body.error_message) updates.error_message = req.body.error_message
  if (req.body.result) updates.result = req.body.result
  const updatedTask = await taskService.update(req.params.id, updates, ownerId)
  successResponse(res, updatedTask)
}))

router.delete('/queue/:id', validateParams(taskIdParamsSchema), asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const taskService = new TaskService(db)
  const ownerId = buildOwnerFilter(req).params[0]
  const task = await taskService.getById(req.params.id, ownerId)
  if (!withEntityNotFound(task, res, 'Task')) return
  await taskService.delete(req.params.id, ownerId)
  deletedResponse(res)
}))

router.post('/queue/:id/retry', validateParams(taskIdParamsSchema), asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const taskService = new TaskService(db)
  const ownerId = buildOwnerFilter(req).params[0]
  const task = await taskService.getById(req.params.id, ownerId)
  if (!withEntityNotFound(task, res, 'Task')) return
  if (task.status !== TaskStatus.FAILED) {
    errorResponse(res, 'Only failed tasks can be retried', 400)
    return
  }
  const updatedTask = await taskService.update(req.params.id, {
    status: TaskStatus.PENDING,
    retry_count: 0,
    error_message: null,
  }, ownerId)
  successResponse(res, updatedTask)
}))

router.get('/dlq', asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const taskService = new TaskService(db)
  const ownerId = buildOwnerFilter(req).params[0]
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50
  const items = await taskService.getDeadLetterQueue(ownerId, limit)
  successResponse(res, { items, total: items.length })
}))

router.post('/dlq/:id/retry', asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const taskService = new TaskService(db)
  const ownerId = buildOwnerFilter(req).params[0]
  const item = await taskService.getDeadLetterItemById(req.params.id, ownerId)
  if (!withEntityNotFound(item, res, 'DLQ item')) return
  const taskId = await taskService.retryFromDeadLetter(req.params.id, ownerId)
  successResponse(res, { taskId: taskId.id, message: 'Task retried successfully' })
}))

router.delete('/dlq/:id', asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const taskService = new TaskService(db)
  const ownerId = buildOwnerFilter(req).params[0]
  const item = await taskService.getDeadLetterItemById(req.params.id, ownerId)
  if (!withEntityNotFound(item, res, 'DLQ item')) return
  await taskService.resolveDeadLetterItem(req.params.id, 'deleted', ownerId)
  successResponse(res, { deleted: true })
}))

export default router