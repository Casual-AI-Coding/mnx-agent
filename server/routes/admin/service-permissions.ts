import { Router } from 'express'
import { asyncHandler } from '../../middleware/asyncHandler'
import { requireRole } from '../../middleware/auth-middleware'
import { getDatabaseService } from '../../service-registration.js'
import { VALID_ROLES } from '../../types/workflow'
import { successResponse, errorResponse } from '../../middleware/api-response'

const router = Router()

router.get('/', requireRole(['super', 'admin']), asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const permissions = await db.getAllServiceNodePermissions()
  successResponse(res, { permissions, total: permissions.length })
}))

router.get('/:service/:method', requireRole(['super', 'admin']), asyncHandler(async (req, res) => {
  const { service, method } = req.params
  const db = getDatabaseService()
  const permission = await db.getServiceNodePermission(service, method)
  
  if (!permission) {
    errorResponse(res, 'Permission not found', 404)
    return
  }
  
  successResponse(res, permission)
}))

router.post('/', requireRole(['super']), asyncHandler(async (req, res) => {
  const { service_name, method_name, display_name, category, min_role = 'pro', is_enabled = true } = req.body
  
  if (!service_name || !method_name || !display_name || !category) {
    errorResponse(res, 'service_name, method_name, display_name, and category are required', 400)
    return
  }
  
  if (min_role && !VALID_ROLES.includes(min_role as typeof VALID_ROLES[number])) {
    errorResponse(res, 'Invalid min_role', 400)
    return
  }
  
  const db = getDatabaseService()
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
    errorResponse(res, 'Invalid min_role', 400)
    return
  }
  
  const db = getDatabaseService()
  const allPermissions = await db.getAllServiceNodePermissions()
  const existing = allPermissions.find(p => p.id === id)
  
  if (!existing) {
    errorResponse(res, 'Permission not found', 404)
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
  
  successResponse(res, updated)
}))

router.delete('/:id', requireRole(['super']), asyncHandler(async (req, res) => {
  const { id } = req.params
  const db = getDatabaseService()
  
  const allPermissions = await db.getAllServiceNodePermissions()
  const existing = allPermissions.find(p => p.id === id)
  
  if (!existing) {
    errorResponse(res, 'Permission not found', 404)
    return
  }
  
  await db.deleteServiceNodePermission(id)
  successResponse(res, { deleted: true })
}))

export default router