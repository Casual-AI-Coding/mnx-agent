import { Router, type Request } from 'express'
import { asyncHandler } from '../../middleware/asyncHandler'
import { requireRole } from '../../middleware/auth-middleware'
import { getDatabaseService, getUserService } from '../../service-registration.js'
import { successResponse, errorResponse } from '../../middleware/api-response'
import type { TokenPayload } from '../../services/user-service.js'

const router = Router()

function getAuthenticatedUser(req: Request): TokenPayload {
  if (!req.user) {
    throw new Error('Admin workflows 路由缺少已认证用户上下文')
  }

  return req.user
}

router.post('/:id/grant', requireRole(['super']), asyncHandler(async (req, res) => {
  const { id } = req.params
  const { userId } = req.body
  const grantedBy = getAuthenticatedUser(req).userId

  if (!userId) {
    errorResponse(res, 'userId is required', 400)
    return
  }

  const db = getDatabaseService()
  const workflow = await db.getWorkflowTemplateById(id)

  if (!workflow) {
    errorResponse(res, 'Workflow not found', 404)
    return
  }

  const userService = getUserService()
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

  const db = getDatabaseService()
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

  const db = getDatabaseService()
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

  const db = getDatabaseService()
  const workflow = await db.getWorkflowTemplateById(id)

  if (!workflow) {
    errorResponse(res, 'Workflow not found', 404)
    return
  }

  const permissions = await db.getWorkflowPermissions(id)
  successResponse(res, permissions)
}))

export default router
