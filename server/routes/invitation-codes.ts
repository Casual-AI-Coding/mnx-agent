import { Router } from 'express'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireRole } from '../middleware/auth-middleware.js'
import { getConnection } from '../database/connection.js'
import { z } from 'zod'
import { validate } from '../middleware/validate.js'
import { v4 as uuidv4 } from 'uuid'
import crypto from 'crypto'

const router = Router()

router.use(requireRole(['super']))

const batchGenerateSchema = z.object({
  count: z.number().int().min(1).max(100),
  max_uses: z.number().int().min(1).default(1),
  expires_at: z.string().datetime().nullable().optional(),
})

router.get('/', asyncHandler(async (req, res) => {
  const conn = getConnection()
  const rows = await conn.query(`
    SELECT ic.*, u.username as created_by_username
    FROM invitation_codes ic
    LEFT JOIN users u ON ic.created_by = u.id
    ORDER BY ic.created_at DESC
  `)
  res.json({ success: true, data: rows })
}))

router.post('/batch', validate(batchGenerateSchema), asyncHandler(async (req, res) => {
  const { count, max_uses, expires_at } = req.body
  const conn = getConnection()
  const codes = []

  for (let i = 0; i < count; i++) {
    const id = uuidv4()
    const code = crypto.randomBytes(16).toString('hex').substring(0, 32).toUpperCase()
    const now = new Date().toISOString()

    await conn.execute(
      `INSERT INTO invitation_codes (id, code, created_by, max_uses, used_count, expires_at, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, code, req.user!.userId, max_uses, 0, expires_at ?? null, true, now]
    )

    codes.push({ code, max_uses, expires_at })
  }

  res.status(201).json({ success: true, data: { count: codes.length, codes } })
}))

router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params
  const conn = getConnection()

  const result = await conn.execute(
    'UPDATE invitation_codes SET is_active = false WHERE id = $1',
    [id]
  )

  if (result.changes === 0) {
    res.status(404).json({ success: false, error: '邀请码不存在' })
    return
  }

  res.json({ success: true, message: '邀请码已失效' })
}))

export default router