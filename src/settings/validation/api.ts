import { z } from 'zod'

const externalEndpointSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  url: z.string().url(),
  protocol: z.enum(['openai', 'anthropic']),
  apiKey: z.string().max(512),
})

export const apiSettingsSchema = z.object({
  minimaxKey: z.string().max(256),
  region: z.enum(['cn', 'intl']),
  mode: z.enum(['direct', 'proxy']),
  timeout: z.number().int().min(1000).max(120000),
  retryAttempts: z.number().int().min(0).max(10),
  retryDelay: z.number().int().min(100).max(30000),
  externalEndpoints: z.array(externalEndpointSchema),
})

export type ApiSettingsInput = z.infer<typeof apiSettingsSchema>