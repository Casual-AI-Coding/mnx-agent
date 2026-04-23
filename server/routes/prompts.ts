import { Router } from 'express'
import { asyncHandler } from '../middleware/asyncHandler'
import { createdResponse, deletedResponse, successResponse } from '../middleware/api-response'
import { validate, validateParams } from '../middleware/validate'
import { getMaterialService } from '../service-registration.js'
import { createPromptSchema, promptIdParamsSchema, updatePromptSchema } from '../validation/prompt-schemas.js'
import { withEntityNotFound } from '../utils/index.js'

const router = Router()

router.post('/', validate(createPromptSchema), asyncHandler(async (req, res) => {
  const materialService = getMaterialService()
  const ownerId = req.user?.userId

  const prompt = await materialService.createPrompt({
    target_type: req.body.target_type,
    target_id: req.body.target_id,
    slot_type: req.body.slot_type,
    name: req.body.name,
    content: req.body.content,
    is_default: req.body.is_default,
    sort_order: req.body.sort_order,
  }, ownerId)

  createdResponse(res, prompt)
}))

router.put('/:promptId', validateParams(promptIdParamsSchema), validate(updatePromptSchema), asyncHandler(async (req, res) => {
  const materialService = getMaterialService()
  const ownerId = req.user?.userId
  const prompt = await materialService.updatePrompt(req.params.promptId, req.body, ownerId)

  if (!withEntityNotFound(prompt, res, 'Prompt')) return

  successResponse(res, prompt)
}))

router.post('/:promptId/set-default', validateParams(promptIdParamsSchema), asyncHandler(async (req, res) => {
  const materialService = getMaterialService()
  const ownerId = req.user?.userId
  const prompt = await materialService.setDefaultPrompt(req.params.promptId, ownerId)

  if (!withEntityNotFound(prompt, res, 'Prompt')) return

  successResponse(res, prompt)
}))

router.delete('/:promptId', validateParams(promptIdParamsSchema), asyncHandler(async (req, res) => {
  const materialService = getMaterialService()
  const ownerId = req.user?.userId
  const deleted = await materialService.softDeletePrompt(req.params.promptId, ownerId)

  if (!deleted) {
    res.status(404).json({
      success: false,
      error: 'Prompt not found',
    })
    return
  }

  deletedResponse(res)
}))

export default router
