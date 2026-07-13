import { Router } from 'express'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireRole } from '../middleware/auth-middleware.js'
import { z } from 'zod'
import { validate } from '../middleware/validate.js'
import { successResponse, errorResponse } from '../middleware/api-response'
import { getInvitationCodeService } from '../service-registration.js'

const router = Router()

router.use(requireRole(['super']))

const batchGenerateSchema = z.object({
  count: z.number().int().min(1).max(100),
  max_uses: z.number().int().min(1).default(1),
  expires_at: z.string().datetime().nullable().optional(),
})

const updateInvitationCodeSchema = z.object({
  max_uses: z.number().int().min(1).optional(),
  expires_at: z.string().datetime().nullable().optional(),
  is_active: z.boolean().optional(),
})

router.get('/', asyncHandler(async (req, res) => {
  const codes = await getInvitationCodeService().list(req.user!.userId)
  successResponse(res, codes)
}))

router.post('/batch', validate(batchGenerateSchema), asyncHandler(async (req, res) => {
  const { count, max_uses, expires_at } = req.body
  const result = await getInvitationCodeService().generateBatch(
    { count, max_uses, expires_at },
    req.user!.userId,
  )
  successResponse(res, result, 201)
}))

router.patch('/:id', validate(updateInvitationCodeSchema), asyncHandler(async (req, res) => {
  const { id } = req.params
  const result = await getInvitationCodeService().update(id, req.body, req.user!.userId)
  if (!result) {
    errorResponse(res, '邀请码不存在', 404)
    return
  }

  if (!result.updated) {
    successResponse(res, { message: '无更新内容', data: result.code })
    return
  }

  successResponse(res, result.code)
}))

router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params
  const deactivated = await getInvitationCodeService().deactivate(id, req.user!.userId)
  if (!deactivated) {
    errorResponse(res, '邀请码不存在', 404)
    return
  }

  successResponse(res, { message: '邀请码已失效' })
}))

export default router
