import { z } from 'zod'

export const workflowSettingsSchema = z.object({
  autoLayout: z.boolean(),
  snapToGrid: z.boolean(),
  gridSize: z.number().int().min(10).max(50),
  showMinimap: z.boolean(),
  defaultZoom: z.number().min(0.25).max(2),
  confirmDelete: z.boolean(),
})

export type WorkflowSettingsInput = z.infer<typeof workflowSettingsSchema>