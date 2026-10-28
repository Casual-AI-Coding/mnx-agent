import { Router } from 'express'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { authenticateJWT } from '../middleware/auth-middleware.js'
import { successResponse } from '../middleware/api-response.js'
import { getAnnouncementService } from '../service-registration.js'

const router = Router()

router.use(authenticateJWT)

/** 当前生效公告（通知中心聚合来源之一，登录用户均可读） */
router.get('/current', asyncHandler(async (_req, res) => {
  const items = await getAnnouncementService().getActive()
  successResponse(res, items)
}))

export default router
