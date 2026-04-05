import { Router } from 'express'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireRole } from '../middleware/auth-middleware.js'
import { getDatabase } from '../database/service-async.js'
import { z } from 'zod'
import { validate } from '../middleware/validate.js'
import { v4 as uuidv4 } from 'uuid'

const router = Router()

// Only super role can access system config
router.use(requireRole(['super']))

const updateConfigSchema = z.object({
  value: z.string(),
  description: z.string().nullable().optional(),
})

const createConfigSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.string(),
  description: z.string().nullable().optional(),
  value_type: z.enum(['string', 'number', 'boolean']).default('string'),
})

// GET /api/system-config - Get all system configs
router.get('/', asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const configs = await db.getAllSystemConfigs()
  res.json({ success: true, data: configs })
}))

// GET /api/system-config/:key - Get a single config by key
router.get('/:key', asyncHandler(async (req, res) => {
  const { key } = req.params
  const db = await getDatabase()
  const config = await db.getSystemConfigByKey(key)
  
  if (!config) {
    res.status(404).json({ success: false, error: 'Configuration not found' })
    return
  }
  
  res.json({ success: true, data: config })
}))

// POST /api/system-config - Create a new config
router.post('/', validate(createConfigSchema), asyncHandler(async (req, res) => {
  const { key, value, description, value_type } = req.body
  const db = await getDatabase()
  
  const existing = await db.getSystemConfigByKey(key)
  if (existing) {
    res.status(400).json({ success: false, error: 'Configuration key already exists' })
    return
  }
  
  const config = await db.createSystemConfig({
    key,
    value,
    description: description ?? null,
    value_type,
  }, req.user?.userId)
  
  res.status(201).json({ success: true, data: config })
}))

// PATCH /api/system-config/:key - Update a config
router.patch('/:key', validate(updateConfigSchema), asyncHandler(async (req, res) => {
  const { key } = req.params
  const { value, description } = req.body
  const db = await getDatabase()
  
  const config = await db.updateSystemConfig(key, {
    value,
    description,
  }, req.user?.userId)
  
  if (!config) {
    res.status(404).json({ success: false, error: 'Configuration not found' })
    return
  }
  
  res.json({ success: true, data: config })
}))

// DELETE /api/system-config/:key - Delete a config
router.delete('/:key', asyncHandler(async (req, res) => {
  const { key } = req.params
  const db = await getDatabase()
  
  const deleted = await db.deleteSystemConfig(key)
  if (!deleted) {
    res.status(404).json({ success: false, error: 'Configuration not found' })
    return
  }
  
  res.json({ success: true, message: 'Configuration deleted' })
}))

export default router
