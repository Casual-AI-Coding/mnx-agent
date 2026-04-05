import { z } from 'zod'

export const accessibilitySettingsSchema = z.object({
  highContrast: z.boolean(),
  screenReader: z.boolean(),
  keyboardShortcuts: z.boolean(),
  focusIndicators: z.boolean(),
})

export type AccessibilitySettingsInput = z.infer<typeof accessibilitySettingsSchema>