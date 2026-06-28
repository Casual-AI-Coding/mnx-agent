import { describe, expect, it } from 'vitest'
import type { ExternalApiLog } from '../../../../packages/shared-types/entities/external-api-log.js'
import {
  buildRecoverableMediaCandidates,
  createMediaRecoveryPlan,
} from '../media-recovery.service.js'

function createLog(overrides: Partial<ExternalApiLog>): ExternalApiLog {
  return {
    id: 1,
    service_provider: 'minimax',
    api_endpoint: '/v1/test',
    operation: 'image_generation',
    request_params: null,
    request_body: null,
    response_body: null,
    status: 'success',
    error_message: null,
    duration_ms: 100,
    user_id: 'user-1',
    trace_id: 'trace-1',
    created_at: '2026-06-29T10:00:00',
    task_status: 'sync',
    result_media_id: null,
    result_data: null,
    ...overrides,
  }
}

describe('media recovery domain service', () => {
  describe('buildRecoverableMediaCandidates', () => {
    it('生成 image、music、voice 三类未恢复候选', () => {
      // Given
      const logs = [
        createLog({
          id: 11,
          operation: 'image_generation',
          response_body: JSON.stringify({ image_urls: ['https://cdn.example.com/a.png', 'https://cdn.example.com/b.png'] }),
        }),
        createLog({
          id: 12,
          operation: 'music_generation',
          response_body: JSON.stringify({ data: { audio: 'https://cdn.example.com/song.mp3' } }),
        }),
        createLog({
          id: 13,
          operation: 'text_to_audio_sync',
          response_body: JSON.stringify({ data: { audio_url: 'https://cdn.example.com/voice.wav' } }),
        }),
      ]

      // When
      const candidates = buildRecoverableMediaCandidates({ logs, existingMedia: [] })

      // Then
      expect(candidates).toEqual([
        {
          log_id: 11,
          operation: 'image_generation',
          type: 'image',
          source: 'image_generation',
          resource_url: 'https://cdn.example.com/a.png',
          image_index: 0,
          created_at: '2026-06-29T10:00:00',
          metadata: {
            source_url: 'https://cdn.example.com/a.png',
            external_api_log_id: 11,
            operation: 'image_generation',
            service_provider: 'minimax',
          },
        },
        {
          log_id: 11,
          operation: 'image_generation',
          type: 'image',
          source: 'image_generation',
          resource_url: 'https://cdn.example.com/b.png',
          image_index: 1,
          created_at: '2026-06-29T10:00:00',
          metadata: {
            source_url: 'https://cdn.example.com/b.png',
            external_api_log_id: 11,
            operation: 'image_generation',
            service_provider: 'minimax',
          },
        },
        {
          log_id: 12,
          operation: 'music_generation',
          type: 'music',
          source: 'music_generation',
          resource_url: 'https://cdn.example.com/song.mp3',
          created_at: '2026-06-29T10:00:00',
          metadata: {
            source_url: 'https://cdn.example.com/song.mp3',
            external_api_log_id: 12,
            operation: 'music_generation',
            service_provider: 'minimax',
          },
        },
        {
          log_id: 13,
          operation: 'text_to_audio_sync',
          type: 'audio',
          source: 'voice_sync',
          resource_url: 'https://cdn.example.com/voice.wav',
          created_at: '2026-06-29T10:00:00',
          metadata: {
            source_url: 'https://cdn.example.com/voice.wav',
            external_api_log_id: 13,
            operation: 'text_to_audio_sync',
            service_provider: 'minimax',
          },
        },
      ])
    })

    it('根据 source_url 与 external_api_log_id 过滤已恢复资源', () => {
      // Given
      const logs = [
        createLog({
          id: 21,
          operation: 'image_generation',
          response_body: JSON.stringify({ image_urls: ['https://cdn.example.com/existing.png'] }),
        }),
        createLog({
          id: 22,
          operation: 'music_generation',
          response_body: JSON.stringify({ data: { audio: 'https://cdn.example.com/recovered-by-log.mp3' } }),
        }),
      ]
      const existingMedia = [
        { metadata: { source_url: 'https://cdn.example.com/existing.png' } },
        { metadata: { external_api_log_id: 22 } },
      ]

      // When
      const candidates = buildRecoverableMediaCandidates({ logs, existingMedia })

      // Then
      expect(candidates).toEqual([])
    })

    it('支持从 JSON 字符串 metadata 中识别已恢复资源', () => {
      // Given
      const logs = [
        createLog({
          id: 23,
          operation: 'image_generation',
          response_body: JSON.stringify({ image_urls: ['https://cdn.example.com/from-json-metadata.png'] }),
        }),
      ]
      const existingMedia = [
        { metadata: JSON.stringify({ source_url: 'https://cdn.example.com/from-json-metadata.png' }) },
      ]

      // When
      const candidates = buildRecoverableMediaCandidates({ logs, existingMedia })

      // Then
      expect(candidates).toEqual([])
    })

    it('跳过不支持 operation、空响应体与无效 JSON', () => {
      // Given
      const logs = [
        createLog({ id: 31, operation: 'chat_completion', response_body: JSON.stringify({ text: 'ok' }) }),
        createLog({ id: 32, operation: 'image_generation', response_body: null }),
        createLog({ id: 33, operation: 'music_generation', response_body: '{broken-json' }),
      ]

      // When
      const candidates = buildRecoverableMediaCandidates({ logs, existingMedia: [] })

      // Then
      expect(candidates).toEqual([])
    })
  })

  describe('createMediaRecoveryPlan', () => {
    it('为成功日志生成媒体恢复计划并保留音乐元数据', () => {
      // Given
      const log = createLog({
        id: 41,
        operation: 'music_generation',
        response_body: JSON.stringify({
          data: {
            audio: 'https://cdn.example.com/song.mp3',
            song_title: '架构之歌',
            lyrics: '高内聚，低耦合',
          },
        }),
      })

      // When
      const plan = createMediaRecoveryPlan({ log })

      // Then
      expect(plan).toEqual({
        ok: true,
        value: {
          resourceUrl: 'https://cdn.example.com/song.mp3',
          originalName: 'music_generation_41.mp3',
          type: 'music',
          source: 'music_generation',
          metadata: {
            song_title: '架构之歌',
            lyrics: '高内聚，低耦合',
            source_url: 'https://cdn.example.com/song.mp3',
            external_api_log_id: 41,
            operation: 'music_generation',
            service_provider: 'minimax',
            restored_from_log: true,
          },
        },
      })
    })

    it('请求的 resource_url 不在日志响应中时返回错误', () => {
      // Given
      const log = createLog({
        id: 51,
        operation: 'image_generation',
        response_body: JSON.stringify({ image_urls: ['https://cdn.example.com/actual.png'] }),
      })

      // When
      const plan = createMediaRecoveryPlan({
        log,
        requestedResourceUrl: 'https://cdn.example.com/missing.png',
      })

      // Then
      expect(plan).toEqual({ ok: false, error: 'resource_url_not_found' })
    })
  })
})
