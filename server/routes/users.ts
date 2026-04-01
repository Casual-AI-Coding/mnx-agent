import { Router } from 'express'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireRole } from '../middleware/auth-middleware.js'
import { getConnection } from '../database/connection.js'
import { UserService } from '../services/user-service.js'
import { z } from 'zod'
import { validateBody } from '../middleware/validate.js'
import bcrypt from 'bcrypt'
import { v4 as uuidv4 } from 'uuid'

const router = Router()

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

router.get('/', asyncHandler(async (req, res) => {
  const conn = getConnection()
  const rows = await conn.query(
    'SELECT id, username, email, minimax_api_key, minimax_region, role, is_active, last_login_at, created_at, updated_at FROM users ORDER BY created_at DESC'
  )
  res.json({ success: true, data: rows })
}))

router.post('/', validateBody(createUserSchema), asyncHandler(async (req, res) => {
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
  res.status(201).json({ success: true, data: user })
}))

router.patch('/:id', validateBody(updateUserSchema), asyncHandler(async (req, res) => {
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
    res.json({ success: true, message: 'No changes' })
    return
  }

  fields.push(`updated_at = $${idx++}`)
  values.push(new Date().toISOString())
  values.push(id)

  await conn.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = $${idx}`, values)

  const userService = new UserService(conn)
  const user = await userService.getUserById(id)
  res.json({ success: true, data: user })
}))

router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params
  const conn = getConnection()

  if (id === req.user?.userId) {
    res.status(400).json({ success: false, error: '不能删除自己的账户' })
    return
  }

  const result = await conn.execute('DELETE FROM users WHERE id = $1', [id])
  if (result.changes === 0) {
    res.status(404).json({ success: false, error: '用户不存在' })
    return
  }

  res.json({ success: true, message: '用户已删除' })
}))

export default router