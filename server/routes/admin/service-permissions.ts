import { Router } from 'express'
import { asyncHandler } from '../../middleware/asyncHandler'
import { requireRole } from '../../middleware/auth-middleware'
import { getDatabase } from '../../database/service-async'
import { VALID_ROLES } from '../../types/workflow'

const router = Router()

router.get('/', requireRole(['super', 'admin']), asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const permissions = await db.getAllServiceNodePermissions()
  res.json({ success: true, data: { permissions, total: permissions.length } })
}))

router.get('/:service/:method', requireRole(['super', 'admin']), asyncHandler(async (req, res) => {
  const { service, method } = req.params
  const db = await getDatabase()
  const permission = await db.getServiceNodePermission(service, method)
  
  if (!permission) {
    res.status(404).json({ success: false, error: 'Permission not found' })
    return
  }
  
  res.json({ success: true, data: permission })
}))

router.post('/', requireRole(['super']), asyncHandler(async (req, res) => {
  const { service_name, method_name, display_name, category, min_role = 'pro', is_enabled = true } = req.body
  
  if (!service_name || !method_name || !display_name || !category) {
    res.status(400).json({ success: false, error: 'service_name, method_name, display_name, and category are required' })
    return
  }
  
  if (min_role && !VALID_ROLES.includes(min_role as typeof VALID_ROLES[number])) {
    res.status(400).json({ success: false, error: 'Invalid min_role' })
    return
  }
  
  const db = await getDatabase()
  await db.upsertServiceNodePermission({
    service_name,
    method_name,
    display_name,
    category,
    min_role,
    is_enabled,
  })
  
  const permission = await db.getServiceNodePermission(service_name, method_name)
  res.status(201).json({ success: true, data: permission })
}))

router.patch('/:id', requireRole(['super', 'admin']), asyncHandler(async (req, res) => {
  const { id } = req.params
  const { display_name, category, min_role, is_enabled } = req.body
  
  if (min_role && !VALID_ROLES.includes(min_role as typeof VALID_ROLES[number])) {
    res.status(400).json({ success: false, error: 'Invalid min_role' })
    return
  }
  
  const db = await getDatabase()
  const allPermissions = await db.getAllServiceNodePermissions()
  const existing = allPermissions.find(p => p.id === id)
  
  if (!existing) {
    res.status(404).json({ success: false, error: 'Permission not found' })
    return
  }
  
  await db.updateServiceNodePermission(id, { min_role, is_enabled })
  
  if (display_name !== undefined || category !== undefined) {
    const conn = db.getConnection()
    const updates: string[] = []
    const values: (string | number)[] = []
    let paramIndex = 1
    
    if (display_name !== undefined) {
      updates.push(`display_name = $${paramIndex}`)
      values.push(display_name)
      paramIndex++
    }
    if (category !== undefined) {
      updates.push(`category = $${paramIndex}`)
      values.push(category)
      paramIndex++
    }
    
    if (updates.length > 0) {
      values.push(id)
      await conn.execute(
        `UPDATE service_node_permissions SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
        values
      )
    }
  }
  
  const updatedPermissions = await db.getAllServiceNodePermissions()
  const updated = updatedPermissions.find(p => p.id === id)
  
  res.json({ success: true, data: updated })
}))

router.delete('/:id', requireRole(['super']), asyncHandler(async (req, res) => {
  const { id } = req.params
  const db = await getDatabase()
  
  const allPermissions = await db.getAllServiceNodePermissions()
  const existing = allPermissions.find(p => p.id === id)
  
  if (!existing) {
    res.status(404).json({ success: false, error: 'Permission not found' })
    return
  }
  
  await db.deleteServiceNodePermission(id)
  res.json({ success: true, data: { deleted: true } })
}))

export default router