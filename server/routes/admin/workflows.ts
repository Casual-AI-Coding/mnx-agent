import { Router } from 'express'
import { asyncHandler } from '../../middleware/asyncHandler'
import { requireRole } from '../../middleware/auth-middleware'
import { getDatabase } from '../../database/service-async'
import { UserService } from '../../services/user-service'
import { getConnection } from '../../database/connection'

const router = Router()

router.post('/:id/grant', requireRole(['super']), asyncHandler(async (req, res) => {
  const { id } = req.params
  const { userId } = req.body
  const grantedBy = req.user!.userId

  if (!userId) {
    res.status(400).json({ success: false, error: 'userId is required' })
    return
  }

  const db = await getDatabase()
  const workflow = await db.getWorkflowTemplateById(id)

  if (!workflow) {
    res.status(404).json({ success: false, error: 'Workflow not found' })
    return
  }

  const conn = getConnection()
  const userService = new UserService(conn)
  const user = await userService.getUserById(userId)

  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' })
    return
  }

  await db.createWorkflowPermission({
    workflow_id: id,
    user_id: userId,
    granted_by: grantedBy,
  })

  res.json({ success: true })
}))

router.delete('/:id/revoke', requireRole(['super']), asyncHandler(async (req, res) => {
  const { id } = req.params
  const { userId } = req.body

  if (!userId) {
    res.status(400).json({ success: false, error: 'userId is required' })
    return
  }

  const db = await getDatabase()
  const workflow = await db.getWorkflowTemplateById(id)

  if (!workflow) {
    res.status(404).json({ success: false, error: 'Workflow not found' })
    return
  }

  await db.deleteWorkflowPermission(id, userId)
  res.json({ success: true })
}))

router.patch('/:id/visibility', requireRole(['super']), asyncHandler(async (req, res) => {
  const { id } = req.params
  const { isPublic } = req.body

  if (typeof isPublic !== 'boolean') {
    res.status(400).json({ success: false, error: 'isPublic must be a boolean' })
    return
  }

  const db = await getDatabase()
  const workflow = await db.getWorkflowTemplateById(id)

  if (!workflow) {
    res.status(404).json({ success: false, error: 'Workflow not found' })
    return
  }

  await db.updateWorkflowTemplate(id, { is_public: isPublic })
  res.json({ success: true })
}))

router.get('/:id/permissions', requireRole(['super']), asyncHandler(async (req, res) => {
  const { id } = req.params

  const db = await getDatabase()
  const workflow = await db.getWorkflowTemplateById(id)

  if (!workflow) {
    res.status(404).json({ success: false, error: 'Workflow not found' })
    return
  }

  const permissions = await db.getWorkflowPermissions(id)
  res.json({ success: true, data: permissions })
}))

export default router