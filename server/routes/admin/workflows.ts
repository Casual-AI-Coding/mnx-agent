import { Router } from 'express'
import { asyncHandler } from '../../middleware/asyncHandler'
import { requireRole } from '../../middleware/auth-middleware'
import { getDatabase } from '../../database/service-async'
import { UserService } from '../../services/user-service'
import { getConnection } from '../../database/connection'
import { successResponse, errorResponse } from '../../middleware/api-response'

const router = Router()

router.post('/:id/grant', requireRole(['super']), asyncHandler(async (req, res) => {
  const { id } = req.params
  const { userId } = req.body
  const grantedBy = req.user!.userId

  if (!userId) {
    errorResponse(res, 'userId is required', 400)
    return
  }

  const db = await getDatabase()
  const workflow = await db.getWorkflowTemplateById(id)

  if (!workflow) {
    errorResponse(res, 'Workflow not found', 404)
    return
  }

  const conn = getConnection()
  const userService = new UserService(conn)
  const user = await userService.getUserById(userId)

  if (!user) {
    errorResponse(res, 'User not found', 404)
    return
  }

  await db.createWorkflowPermission({
    workflow_id: id,
    user_id: userId,
    granted_by: grantedBy,
  })

  successResponse(res, null)
}))

router.delete('/:id/revoke', requireRole(['super']), asyncHandler(async (req, res) => {
  const { id } = req.params
  const { userId } = req.body

  if (!userId) {
    errorResponse(res, 'userId is required', 400)
    return
  }

  const db = await getDatabase()
  const workflow = await db.getWorkflowTemplateById(id)

  if (!workflow) {
    errorResponse(res, 'Workflow not found', 404)
    return
  }

  await db.deleteWorkflowPermission(id, userId)
  successResponse(res, null)
}))

router.patch('/:id/visibility', requireRole(['super']), asyncHandler(async (req, res) => {
  const { id } = req.params
  const { isPublic } = req.body

  if (typeof isPublic !== 'boolean') {
    errorResponse(res, 'isPublic must be a boolean', 400)
    return
  }

  const db = await getDatabase()
  const workflow = await db.getWorkflowTemplateById(id)

  if (!workflow) {
    errorResponse(res, 'Workflow not found', 404)
    return
  }

  await db.updateWorkflowTemplate(id, { is_public: isPublic })
  successResponse(res, null)
}))

router.get('/:id/permissions', requireRole(['super']), asyncHandler(async (req, res) => {
  const { id } = req.params

  const db = await getDatabase()
  const workflow = await db.getWorkflowTemplateById(id)

  if (!workflow) {
    errorResponse(res, 'Workflow not found', 404)
    return
  }

  const permissions = await db.getWorkflowPermissions(id)
  successResponse(res, permissions)
}))

export default router