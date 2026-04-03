import { Router } from 'express'
import { asyncHandler } from '../../middleware/asyncHandler'
import { requireRole } from '../../middleware/auth-middleware'
import { getDatabase } from '../../database/service-async'
import { VALID_ROLES } from '../../types/workflow'

const router = Router()

router.get('/', requireRole(['super']), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const nodes = await db.getAllServiceNodePermissions()
  res.json({ success: true, data: nodes })
}))

router.patch('/:id', requireRole(['super']), asyncHandler(async (req, res) => {
  const { id } = req.params
  const { min_role, is_enabled } = req.body

  if (min_role && !VALID_ROLES.includes(min_role as typeof VALID_ROLES[number])) {
    res.status(400).json({ success: false, error: 'Invalid min_role' })
    return
  }

  const db = await getDatabase()
  const existing = await db.getAllServiceNodePermissions()
  const node = existing.find(n => n.id === id)
  
  if (!node) {
    res.status(404).json({ success: false, error: 'Service node not found' })
    return
  }

  await db.updateServiceNodePermission(id, { min_role, is_enabled })
  
  const updatedNodes = await db.getAllServiceNodePermissions()
  const updated = updatedNodes.find(n => n.id === id)

  res.json({ success: true, data: updated })
}))

export default router