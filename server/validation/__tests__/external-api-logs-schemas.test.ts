import { describe, expect, it } from 'vitest'
import {
  createExternalApiLogSchema,
  updateExternalApiLogSchema,
  externalApiStatusEnum,
} from '../external-api-logs-schemas'

describe('external api log schemas', () => {
  it('accepts pending status for browser-created logs', () => {
    expect(externalApiStatusEnum.parse('pending')).toBe('pending')
  })

  it('creates an openai image_generation log without secret fields', () => {
    const parsed = createExternalApiLogSchema.parse({
      service_provider: 'openai',
      api_endpoint: 'POST /v1/images/generations',
      operation: 'image_generation',
      request_params: {
        model: 'gpt-image-2',
        size: '1376x2048',
        quality: 'high',
        background: 'auto',
        output_format: 'png',
        moderation: 'auto',
        image_count: 1,
      },
      request_body: JSON.stringify({ prompt: '一张电影感人像海报，暖色光照，细节丰富' }),
      trace_id: 'trace-openai-image-2',
    })

    expect(parsed.status).toBe('pending')
    expect(parsed.service_provider).toBe('openai')
  })

  it('rejects secrets and base64 payloads in log creation', () => {
    expect(() => createExternalApiLogSchema.parse({
      service_provider: 'openai',
      api_endpoint: 'POST /v1/images/generations',
      operation: 'image_generation',
      request_params: { authorization: 'Bearer sk-secret' },
    })).toThrow()

    expect(() => createExternalApiLogSchema.parse({
      service_provider: 'openai',
      api_endpoint: 'POST /v1/images/generations',
      operation: 'image_generation',
      response_body: 'iVBORw0KGgoAAAANSUhEUgAA'.repeat(20),
    })).toThrow()
  })

  it('updates a log with response summary only', () => {
    const parsed = updateExternalApiLogSchema.parse({
      status: 'success',
      duration_ms: 1432,
      response_body: JSON.stringify({
        created: 1770000000,
        model: 'gpt-image-2',
        image_count: 1,
        usage: { total_tokens: 120 },
      }),
    })

    expect(parsed.status).toBe('success')
    expect(parsed.duration_ms).toBe(1432)
  })
})
