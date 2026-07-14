import { Router } from 'express'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireRole } from '../middleware/auth-middleware.js'
import { getConnection } from '../database/connection.js'
import { getAdminUserService } from '../service-registration.js'
import { z } from 'zod'
import { validate, validateQuery } from '../middleware/validate.js'
import { successResponse, errorResponse } from '../middleware/api-response'
import { toLocalISODateString } from '../lib/date-utils.js'

const router = Router()

router.use(requireRole(['super']))

const updateUserSchema = z.object({
  email: z.email().nullable().optional(),
  role: z.enum(['super', 'admin', 'pro', 'user']).optional(),
  is_active: z.boolean().optional(),
  minimax_api_key: z.string().nullable().optional(),
  minimax_region: z.enum(['cn', 'intl']).optional(),
})

const createUserSchema = z.object({
  username: z.string().min(1).max(50),
  password: z.string().min(6),
  email: z.email().nullable().optional(),
  role: z.enum(['super', 'admin', 'pro', 'user']).default('user'),
  minimax_api_key: z.string().nullable().optional(),
})

const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

type UpdateUserInput = z.infer<typeof updateUserSchema>

router.get('/', validateQuery(listUsersQuerySchema), asyncHandler(async (req, res) => {
  const query = listUsersQuerySchema.parse(req.query)
  const { page, limit } = query
  const adminUserService = getAdminUserService()
  const result = await adminUserService.listUsers({ page, limit })

  successResponse(res, result)
}))

router.post('/', validate(createUserSchema), asyncHandler(async (req, res) => {
  const adminUserService = getAdminUserService()
  const user = await adminUserService.createUser(req.body)
  successResponse(res, user, 201)
}))

router.patch('/:id', validate(updateUserSchema), asyncHandler(async (req, res) => {
  const { id } = req.params
  const updates: UpdateUserInput = req.body

  const hasChanges = Object.keys(updates).length > 0
  if (!hasChanges) {
    successResponse(res, { message: 'No changes' })
    return
  }

  const adminUserService = getAdminUserService()
  const user = await adminUserService.updateUser(id, updates)
  successResponse(res, user)
}))

router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params

  if (id === req.user?.userId) {
    errorResponse(res, '不能删除自己的账户', 400)
    return
  }

  const adminUserService = getAdminUserService()
  const deleted = await adminUserService.deleteUser(id)

  if (!deleted) {
    errorResponse(res, '用户不存在', 404)
    return
  }

  successResponse(res, { message: '用户已删除' })
}))

const batchOperationSchema = z.object({
  action: z.enum(['activate', 'deactivate', 'delete']),
  userIds: z.array(z.uuid()).min(1),
})

router.post('/batch', validate(batchOperationSchema), asyncHandler(async (req, res) => {
  const { action, userIds } = req.body
  const conn = getConnection()
  const currentUserId = req.user?.userId

  if (action === 'delete' && userIds.includes(currentUserId)) {
    errorResponse(res, '不能删除自己的账户', 400)
    return
  }

  const now = toLocalISODateString()
  let successCount = 0
  let failCount = 0

  switch (action) {
    case 'activate':
      for (const id of userIds) {
        try {
          await conn.execute(
            'UPDATE users SET is_active = $1, updated_at = $2 WHERE id = $3',
            [true, now, id]
          )
          successCount++
        } catch {
          failCount++
        }
      }
      break
    case 'deactivate':
      for (const id of userIds) {
        try {
          if (id === currentUserId) {
            failCount++
            continue
          }
          await conn.execute(
            'UPDATE users SET is_active = $1, updated_at = $2 WHERE id = $3',
            [false, now, id]
          )
          successCount++
        } catch {
          failCount++
        }
      }
      break
    case 'delete':
      for (const id of userIds) {
        try {
          await conn.execute('DELETE FROM users WHERE id = $1', [id])
          successCount++
        } catch {
          failCount++
        }
      }
      break
  }

  successResponse(res, {
    data: {
      action,
      successCount,
      failCount,
      total: userIds.length,
    },
    message: `批量操作完成：成功 ${successCount} 个，失败 ${failCount} 个`,
  })
}))

router.post('/:id/reset-password', asyncHandler(async (req, res) => {
  const { id } = req.params
  const adminUserService = getAdminUserService()
  const reset = await adminUserService.resetPassword(id)

  if (!reset) {
    errorResponse(res, '用户不存在', 404)
    return
  }

  successResponse(res, { message: '密码已重置' })
}))

export default router
