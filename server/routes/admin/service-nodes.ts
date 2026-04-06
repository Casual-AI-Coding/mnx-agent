import { Router } from 'express'
import { asyncHandler } from '../../middleware/asyncHandler'
import { requireRole } from '../../middleware/auth-middleware'
import { getDatabaseService } from '../../service-registration.js'
import { VALID_ROLES } from '../../types/workflow'
import { successResponse, errorResponse } from '../../middleware/api-response'

const router = Router()

router.get('/', requireRole(['super']), asyncHandler(async (req, res) => {
  const db = getDatabaseService()
  const nodes = await db.getAllServiceNodePermissions()
  successResponse(res, nodes)
}))

router.patch('/:id', requireRole(['super']), asyncHandler(async (req, res) => {
  const { id } = req.params
  const { min_role, is_enabled } = req.body

  if (min_role && !VALID_ROLES.includes(min_role as typeof VALID_ROLES[number])) {
    errorResponse(res, 'Invalid min_role', 400)
    return
  }

  const db = getDatabaseService()
  const existing = await db.getAllServiceNodePermissions()
  const node = existing.find(n => n.id === id)
  
  if (!node) {
    errorResponse(res, 'Service node not found', 404)
    return
  }

  await db.updateServiceNodePermission(id, { min_role, is_enabled })
  
  const updatedNodes = await db.getAllServiceNodePermissions()
  const updated = updatedNodes.find(n => n.id === id)

  successResponse(res, updated)
}))

router.delete('/:id', requireRole(['super']), asyncHandler(async (req, res) => {
  const { id } = req.params
  const db = getDatabaseService()

  const existing = await db.getAllServiceNodePermissions()
  const node = existing.find(n => n.id === id)
  
  if (!node) {
    errorResponse(res, 'Service node not found', 404)
    return
  }

  await db.deleteServiceNodePermission(id)

  successResponse(res, { message: 'Service node deleted' })
}))

export default router