import { Router } from 'express'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireRole } from '../middleware/auth-middleware.js'
import { getConnection } from '../database/connection.js'
import { UserService } from '../services/user-service.js'
import { z } from 'zod'
import { validate, validateQuery } from '../middleware/validate.js'
import bcrypt from 'bcrypt'
import { v4 as uuidv4 } from 'uuid'
import { successResponse, errorResponse } from '../middleware/api-response'

const router = Router()

function generateRandomPassword(length: number = 12): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const special = '!@#$%^&*'
  const all = uppercase + lowercase + numbers + special

  let password = ''
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += special[Math.floor(Math.random() * special.length)]

  for (let i = 4; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)]
  }

  return password.split('').sort(() => Math.random() - 0.5).join('')
}

router.use(requireRole(['super']))

const updateUserSchema = z.object({
  email: z.string().email().nullable().optional(),
  role: z.enum(['super', 'admin', 'pro', 'user']).optional(),
  is_active: z.boolean().optional(),
  minimax_api_key: z.string().nullable().optional(),
  minimax_region: z.enum(['cn', 'intl']).optional(),
})

const createUserSchema = z.object({
  username: z.string().min(1).max(50),
  password: z.string().min(6),
  email: z.string().email().nullable().optional(),
  role: z.enum(['super', 'admin', 'pro', 'user']).default('user'),
  minimax_api_key: z.string().nullable().optional(),
})

const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

router.get('/', validateQuery(listUsersQuerySchema), asyncHandler(async (req, res) => {
  const { page, limit } = req.query as unknown as { page: number; limit: number }
  const conn = getConnection()

  const countResult = await conn.query<{ total: number }>('SELECT COUNT(*) as total FROM users')
  const total = countResult[0]?.total || 0

  const offset = (page - 1) * limit
  const rows = await conn.query(
    'SELECT id, username, email, minimax_api_key, minimax_region, role, is_active, last_login_at, created_at, updated_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
    [limit, offset]
  )

  successResponse(res, {
    data: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}))

router.post('/', validate(createUserSchema), asyncHandler(async (req, res) => {
  const { username, password, email, role, minimax_api_key } = req.body
  const conn = getConnection()
  const passwordHash = await bcrypt.hash(password, 12)
  const id = uuidv4()
  const now = new Date().toISOString()

  await conn.execute(
    `INSERT INTO users (id, username, email, password_hash, role, minimax_api_key, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [id, username, email ?? null, passwordHash, role, minimax_api_key ?? null, true, now, now]
  )

  const userService = new UserService(conn)
  const user = await userService.getUserById(id)
  successResponse(res, user, 201)
}))

router.patch('/:id', validate(updateUserSchema), asyncHandler(async (req, res) => {
  const { id } = req.params
  const updates = req.body
  const conn = getConnection()

  const fields: string[] = []
  const values: any[] = []
  let idx = 1

  if (updates.email !== undefined) { fields.push(`email = $${idx++}`); values.push(updates.email) }
  if (updates.role !== undefined) { fields.push(`role = $${idx++}`); values.push(updates.role) }
  if (updates.is_active !== undefined) { fields.push(`is_active = $${idx++}`); values.push(updates.is_active) }
  if (updates.minimax_api_key !== undefined) { fields.push(`minimax_api_key = $${idx++}`); values.push(updates.minimax_api_key) }
  if (updates.minimax_region !== undefined) { fields.push(`minimax_region = $${idx++}`); values.push(updates.minimax_region) }

  if (fields.length === 0) {
    successResponse(res, { message: 'No changes' })
    return
  }

  fields.push(`updated_at = $${idx++}`)
  values.push(new Date().toISOString())
  values.push(id)

  await conn.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = $${idx}`, values)

  const userService = new UserService(conn)
  const user = await userService.getUserById(id)
  successResponse(res, user)
}))

router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params
  const conn = getConnection()

  if (id === req.user?.userId) {
    errorResponse(res, '不能删除自己的账户', 400)
    return
  }

  const result = await conn.execute('DELETE FROM users WHERE id = $1', [id])
  if (result.changes === 0) {
    errorResponse(res, '用户不存在', 404)
    return
  }

  successResponse(res, { message: '用户已删除' })
}))

const batchOperationSchema = z.object({
  action: z.enum(['activate', 'deactivate', 'delete']),
  userIds: z.array(z.string().uuid()).min(1),
})

router.post('/batch', validate(batchOperationSchema), asyncHandler(async (req, res) => {
  const { action, userIds } = req.body
  const conn = getConnection()
  const currentUserId = req.user?.userId

  if (action === 'delete' && userIds.includes(currentUserId)) {
    errorResponse(res, '不能删除自己的账户', 400)
    return
  }

  const now = new Date().toISOString()
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
  const conn = getConnection()

  const user = await conn.query('SELECT id, username FROM users WHERE id = $1', [id])
  if (user.length === 0) {
    errorResponse(res, '用户不存在', 404)
    return
  }

  const newPassword = generateRandomPassword(12)
  const passwordHash = await bcrypt.hash(newPassword, 12)

  await conn.execute(
    'UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3',
    [passwordHash, new Date().toISOString(), id]
  )

  successResponse(res, {
    newPassword,
    message: '密码已重置',
  })
}))

export default router