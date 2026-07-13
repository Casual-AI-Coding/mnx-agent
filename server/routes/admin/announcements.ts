import { Router, type Request } from 'express'
import { z } from 'zod'

import { asyncHandler } from '../../middleware/asyncHandler.js'
import { successResponse, createdResponse, deletedResponse, errorResponse } from '../../middleware/api-response.js'
import { requireRole } from '../../middleware/auth-middleware.js'
import { getAnnouncementService } from '../../service-registration.js'

const router = Router()

const severitySchema = z.enum(['info', 'success', 'warning', 'error'])
const statusSchema = z.enum(['draft', 'published', 'archived'])
const nullableDateSchema = z
  .string()
  .min(1)
  .refine(value => !Number.isNaN(new Date(value).getTime()))
  .nullable()
  .optional()

const createAnnouncementSchema = z.object({
  title: z.string().trim().min(1).max(120),
  content: z.string().trim().min(1).max(5000),
  severity: severitySchema.default('info'),
  status: statusSchema.default('draft'),
  starts_at: nullableDateSchema,
  ends_at: nullableDateSchema,
})

const updateAnnouncementSchema = createAnnouncementSchema.partial()

type AnnouncementInput = z.infer<typeof createAnnouncementSchema>
type AnnouncementUpdate = z.infer<typeof updateAnnouncementSchema>

function getAuthenticatedUserId(req: Request): string {
  if (!req.user) {
    throw new Error('公告管理路由缺少已认证用户上下文')
  }

  return req.user.userId
}

function hasInvalidWindow(input: Pick<AnnouncementInput, 'starts_at' | 'ends_at'>): boolean {
  if (!input.starts_at || !input.ends_at) {
    return false
  }

  return new Date(input.ends_at).getTime() < new Date(input.starts_at).getTime()
}

function parseCreateInput(body: unknown): AnnouncementInput | null {
  const result = createAnnouncementSchema.safeParse(body)
  if (!result.success || hasInvalidWindow(result.data)) {
    return null
  }

  return result.data
}

function parseUpdateInput(body: unknown): AnnouncementUpdate | null {
  const result = updateAnnouncementSchema.safeParse(body)
  if (!result.success || hasInvalidWindow(result.data)) {
    return null
  }

  return result.data
}

router.get('/active', asyncHandler(async (_req, res) => {
  successResponse(res, await getAnnouncementService().getActive())
}))

router.use(requireRole(['super']))

router.get('/', asyncHandler(async (_req, res) => {
  const items = await getAnnouncementService().getAll()
  successResponse(res, { items, total: items.length })
}))

router.post('/', asyncHandler(async (req, res) => {
  const input = parseCreateInput(req.body)
  if (!input) {
    errorResponse(res, '公告内容或发布时间窗口无效', 400)
    return
  }

  createdResponse(res, await getAnnouncementService().create(input, getAuthenticatedUserId(req)))
}))

router.patch('/:id', asyncHandler(async (req, res) => {
  const input = parseUpdateInput(req.body)
  if (!input) {
    errorResponse(res, '公告更新内容或发布时间窗口无效', 400)
    return
  }

  const updated = await getAnnouncementService().update(req.params.id, input, getAuthenticatedUserId(req))
  if (!updated) {
    errorResponse(res, '公告不存在', 404)
    return
  }

  successResponse(res, updated)
}))

router.delete('/:id', asyncHandler(async (req, res) => {
  if (!await getAnnouncementService().delete(req.params.id, getAuthenticatedUserId(req))) {
    errorResponse(res, '公告不存在', 404)
    return
  }

  deletedResponse(res)
}))

export default router
