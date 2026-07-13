import { Router } from 'express'
import { asyncHandler } from '../../middleware/asyncHandler'
import { requireRole } from '../../middleware/auth-middleware'
import { getServiceNodePermissionService } from '../../service-registration.js'
import { VALID_ROLES } from '../../types/workflow'
import { successResponse, errorResponse } from '../../middleware/api-response'

const router = Router()

router.get('/', requireRole(['super', 'admin']), asyncHandler(async (req, res) => {
  const svc = getServiceNodePermissionService()
  const permissions = await svc.getAll()
  successResponse(res, { permissions, total: permissions.length })
}))

router.get('/:service/:method', requireRole(['super', 'admin']), asyncHandler(async (req, res) => {
  const { service, method } = req.params
  const svc = getServiceNodePermissionService()
  const permission = await svc.get(service, method)
  
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
  
  const svc = getServiceNodePermissionService()
  await svc.upsert({
    service_name,
    method_name,
    display_name,
    category,
    min_role,
    is_enabled,
  })
  
  const permission = await svc.get(service_name, method_name)
  res.status(201).json({ success: true, data: permission })
}))

router.patch('/:id', requireRole(['super', 'admin']), asyncHandler(async (req, res) => {
  const { id } = req.params
  const { display_name, category, min_role, is_enabled } = req.body
  
  if (min_role && !VALID_ROLES.includes(min_role as typeof VALID_ROLES[number])) {
    errorResponse(res, 'Invalid min_role', 400)
    return
  }
  
  const svc = getServiceNodePermissionService()
  const allPermissions = await svc.getAll()
  const existing = allPermissions.find(p => p.id === id)
  
  if (!existing) {
    errorResponse(res, 'Permission not found', 404)
    return
  }
  
  await svc.update(id, { display_name, category, min_role, is_enabled })
  
  const updatedPermissions = await svc.getAll()
  const updated = updatedPermissions.find(p => p.id === id)
  
  successResponse(res, updated)
}))

router.delete('/:id', requireRole(['super']), asyncHandler(async (req, res) => {
  const { id } = req.params
  const svc = getServiceNodePermissionService()
  
  const allPermissions = await svc.getAll()
  const existing = allPermissions.find(p => p.id === id)
  
  if (!existing) {
    errorResponse(res, 'Permission not found', 404)
    return
  }
  
  await svc.delete(id)
  successResponse(res, { deleted: true })
}))

export default router
