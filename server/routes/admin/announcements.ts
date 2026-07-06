import { Router, type Request } from 'express'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'

import { getConnection } from '../../database/connection.js'
import { asyncHandler } from '../../middleware/asyncHandler.js'
import { successResponse, createdResponse, deletedResponse, errorResponse } from '../../middleware/api-response.js'
import { requireRole } from '../../middleware/auth-middleware.js'
import { toLocalISODateString } from '../../lib/date-utils.js'

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

interface AnnouncementRow {
  id: string
  title: string
  content: string
  severity: string
  status: string
  starts_at: string | null
  ends_at: string | null
  owner_id: string
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  is_deleted: boolean
  created_by_username?: string | null
  updated_by_username?: string | null
}

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

async function getAnnouncementById(id: string): Promise<AnnouncementRow | null> {
  const rows = await getConnection().query<AnnouncementRow>(
    `SELECT * FROM announcements WHERE id = $1 AND is_deleted = false`,
    [id]
  )

  return rows[0] ?? null
}

router.get('/active', asyncHandler(async (_req, res) => {
  const rows = await getConnection().query<AnnouncementRow>(`
    SELECT *
    FROM announcements
    WHERE is_deleted = false
      AND status = 'published'
      AND (starts_at IS NULL OR starts_at <= CURRENT_TIMESTAMP)
      AND (ends_at IS NULL OR ends_at >= CURRENT_TIMESTAMP)
    ORDER BY created_at DESC
  `)

  successResponse(res, rows)
}))

router.use(requireRole(['super']))

router.get('/', asyncHandler(async (_req, res) => {
  const rows = await getConnection().query<AnnouncementRow>(`
    SELECT a.*, creator.username AS created_by_username, updater.username AS updated_by_username
    FROM announcements a
    LEFT JOIN users creator ON creator.id = a.created_by
    LEFT JOIN users updater ON updater.id = a.updated_by
    WHERE a.is_deleted = false
    ORDER BY a.created_at DESC
  `)

  successResponse(res, { items: rows, total: rows.length })
}))

router.post('/', asyncHandler(async (req, res) => {
  const input = parseCreateInput(req.body)
  if (!input) {
    errorResponse(res, '公告内容或发布时间窗口无效', 400)
    return
  }

  const userId = getAuthenticatedUserId(req)
  const now = toLocalISODateString()
  const id = uuidv4()

  await getConnection().execute(
    `INSERT INTO announcements (
      id, title, content, severity, status, starts_at, ends_at, owner_id, created_by, updated_by, created_at, updated_at, is_deleted
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, $8, $9, $9, false)`,
    [id, input.title, input.content, input.severity, input.status, input.starts_at ?? null, input.ends_at ?? null, userId, now]
  )

  const created = await getAnnouncementById(id)
  createdResponse(res, created)
}))

router.patch('/:id', asyncHandler(async (req, res) => {
  const input = parseUpdateInput(req.body)
  if (!input) {
    errorResponse(res, '公告更新内容或发布时间窗口无效', 400)
    return
  }

  const existing = await getAnnouncementById(req.params.id)
  if (!existing) {
    errorResponse(res, '公告不存在', 404)
    return
  }

  const fields: string[] = []
  const values: unknown[] = []
  let nextIndex = 1

  if (input.title !== undefined) {
    fields.push(`title = $${nextIndex}`)
    values.push(input.title)
    nextIndex++
  }
  if (input.content !== undefined) {
    fields.push(`content = $${nextIndex}`)
    values.push(input.content)
    nextIndex++
  }
  if (input.severity !== undefined) {
    fields.push(`severity = $${nextIndex}`)
    values.push(input.severity)
    nextIndex++
  }
  if (input.status !== undefined) {
    fields.push(`status = $${nextIndex}`)
    values.push(input.status)
    nextIndex++
  }
  if (input.starts_at !== undefined) {
    fields.push(`starts_at = $${nextIndex}`)
    values.push(input.starts_at)
    nextIndex++
  }
  if (input.ends_at !== undefined) {
    fields.push(`ends_at = $${nextIndex}`)
    values.push(input.ends_at)
    nextIndex++
  }

  const userId = getAuthenticatedUserId(req)
  fields.push(`updated_by = $${nextIndex}`)
  values.push(userId)
  nextIndex++
  fields.push(`updated_at = $${nextIndex}`)
  values.push(toLocalISODateString())
  nextIndex++
  values.push(req.params.id)

  await getConnection().execute(
    `UPDATE announcements SET ${fields.join(', ')} WHERE id = $${nextIndex} AND is_deleted = false`,
    values
  )

  const updated = await getAnnouncementById(req.params.id)
  successResponse(res, updated)
}))

router.delete('/:id', asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req)
  const result = await getConnection().execute(
    `UPDATE announcements
     SET is_deleted = true, deleted_at = $1, updated_at = $1, updated_by = $2
     WHERE id = $3 AND is_deleted = false`,
    [toLocalISODateString(), userId, req.params.id]
  )

  if (result.changes === 0) {
    errorResponse(res, '公告不存在', 404)
    return
  }

  deletedResponse(res)
}))

export default router
