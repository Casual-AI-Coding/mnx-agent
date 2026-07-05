import { describe, expect, it, beforeEach } from 'vitest'
import { FORM_PERSISTENCE_KEYS } from '@/hooks/useFormPersistence'
import {
  applyHistoryReplaySnapshot,
  canReplayHistoryItem,
  createAuditReplaySnapshot,
  createHistoryReplaySnapshot,
} from '@/lib/history-replay'
import type { AuditLog } from '@/lib/api/audit'

const createAuditLog = (requestPath: string, requestBody: Record<string, unknown>): AuditLog => ({
  id: 'audit-1',
  action: 'execute',
  resource_type: 'external_api',
  resource_id: null,
  user_id: 'user-1',
  username: '测试用户',
  ip_address: '127.0.0.1',
  user_agent: 'vitest',
  request_method: 'POST',
  request_path: requestPath,
  request_body: requestBody,
  query_params: null,
  response_body: null,
  response_status: 200,
  error_message: null,
  duration_ms: 120,
  trace_id: 'trace-1',
  created_at: '2026-07-06T00:00:00',
})

describe('history replay', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('restores form parameters and returns target route without triggering generation', () => {
    const routePath = applyHistoryReplaySnapshot({
      source: 'history',
      label: '图片参数',
      routePath: '/image',
      formPersistenceKey: FORM_PERSISTENCE_KEYS.IMAGE_GENERATION,
      formData: {
        prompt: '海边日落',
        model: 'image-01',
        aspectRatioState: '16:9',
        numImages: 2,
      },
    })

    expect(routePath).toBe('/image')
    expect(window.localStorage.getItem('form-persistence:image-generation')).toBe(JSON.stringify({
      prompt: '海边日落',
      model: 'image-01',
      aspectRatioState: '16:9',
      numImages: 2,
    }))
    expect(window.localStorage.getItem('history-replay:auto-generate')).toBeNull()
  })

  it('does not mark unsupported history records as replayable', () => {
    expect(canReplayHistoryItem({
      id: 'text-1',
      type: 'text',
      timestamp: 1710000000000,
      input: '旧记录',
      metadata: { model: 'abab6.5s-chat' },
    })).toBe(false)
  })

  it('creates a history snapshot that targets a form persistence key', () => {
    expect(createHistoryReplaySnapshot({
      label: '文本参数',
      routePath: '/text',
      formPersistenceKey: FORM_PERSISTENCE_KEYS.TEXT_GENERATION,
      formData: {
        input: '写一段发布文案',
        selectedModel: 'abab6.5s-chat',
        promptCaching: true,
      },
    })).toEqual({
      source: 'history',
      label: '文本参数',
      routePath: '/text',
      formPersistenceKey: FORM_PERSISTENCE_KEYS.TEXT_GENERATION,
      formData: {
        input: '写一段发布文案',
        selectedModel: 'abab6.5s-chat',
        promptCaching: true,
      },
    })
  })

  it('creates an audit replay snapshot for allowlisted image generation requests', () => {
    expect(createAuditReplaySnapshot(createAuditLog('/api/image/generate', {
      model: 'image-01',
      prompt: '雨夜城市',
      aspect_ratio: '16:9',
      n: 2,
      prompt_optimizer: true,
      aigc_watermark: false,
      seed: 1234,
    }))).toEqual({
      source: 'audit',
      label: '审计日志图片参数',
      routePath: '/image',
      formPersistenceKey: FORM_PERSISTENCE_KEYS.IMAGE_GENERATION,
      formData: {
        prompt: '雨夜城市',
        model: 'image-01',
        aspectRatioState: { type: 'preset', preset: '16:9' },
        numImages: 2,
        referenceImageMode: 'upload',
        referenceImageUrl: '',
        seed: 1234,
        promptOptimizer: true,
        aigcWatermark: false,
        imageTitle: '',
        parallelCount: 1,
      },
    })
  })

  it('rejects audit replay when the request is not allowlisted or contains sensitive fields', () => {
    expect(createAuditReplaySnapshot(createAuditLog('/api/users', { username: 'demo' }))).toBeNull()
    expect(createAuditReplaySnapshot(createAuditLog('/api/image/generate', {
      prompt: 'secret image',
      model: 'image-01',
      api_key: 'sk-test',
    }))).toBeNull()
  })
})
