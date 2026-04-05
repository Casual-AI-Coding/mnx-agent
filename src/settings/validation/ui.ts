import { z } from 'zod'

export const uiSettingsSchema = z.object({
  theme: z.union([z.literal('system'), z.string()]),
  sidebarCollapsed: z.boolean(),
  sidebarWidth: z.number().int().min(200).max(400),
  showAnimations: z.boolean(),
  reducedMotion: z.boolean(),
  toastPosition: z.enum(['top-left', 'top-right', 'bottom-left', 'bottom-right']),
  density: z.enum(['compact', 'comfortable', 'spacious']),
  fontSize: z.enum(['small', 'medium', 'large']),
})

export type UISettingsInput = z.infer<typeof uiSettingsSchema>