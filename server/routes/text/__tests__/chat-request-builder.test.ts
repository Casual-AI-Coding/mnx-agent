import { describe, expect, it } from 'vitest'
import type { Request } from 'express'
import { buildChatRequestBody } from '../chat-request-builder'
import { DEFAULT_CHAT_MODEL } from '../../../config/model-defaults'

/**
 * buildChatRequestBody 单元测试（ADR-0006 Phase 2）。
 *
 * 关注点：
 * - 消息数组校验（缺失 / 非数组 / 空数组 三种非法情况）
 * - model 字段回退到 DEFAULT_CHAT_MODEL 常量
 * - 显式 model 优先级
 * - stream 选项是否正确写入 body.stream
 * - 可选字段 temperature/top_p/max_completion_tokens 的有条件写入
 */
function mockRequest(body: unknown): Request {
  return { body } as unknown as Request
}

describe('buildChatRequestBody', () => {
  it('使用默认模型构造非流式请求体', () => {
    const body = buildChatRequestBody(
      mockRequest({ messages: [{ role: 'user', content: '你好' }] })
    )

    expect(body).toEqual({
      model: DEFAULT_CHAT_MODEL,
      messages: [{ role: 'user', content: '你好' }],
    })
    expect(body.stream).toBeUndefined()
  })

  it('优先使用请求体中显式指定的 model', () => {
    const body = buildChatRequestBody(
      mockRequest({
        model: 'custom-model-x',
        messages: [{ role: 'user', content: 'hi' }],
      })
    )

    expect(body.model).toBe('custom-model-x')
  })

  it('在 stream 模式下追加 stream=true', () => {
    const body = buildChatRequestBody(
      mockRequest({ messages: [{ role: 'user', content: 'hi' }] }),
      { stream: true }
    )

    expect(body.stream).toBe(true)
  })

  it('非 stream 模式不写入 stream 字段', () => {
    const body = buildChatRequestBody(
      mockRequest({ messages: [{ role: 'user', content: 'hi' }] })
    )

    expect(body).not.toHaveProperty('stream')
  })

  it('保留 temperature/top_p/max_completion_tokens 可选字段', () => {
    const body = buildChatRequestBody(
      mockRequest({
        messages: [{ role: 'user', content: 'hi' }],
        temperature: 0.7,
        top_p: 0.9,
        max_completion_tokens: 1024,
      })
    )

    expect(body.temperature).toBe(0.7)
    expect(body.top_p).toBe(0.9)
    expect(body.max_completion_tokens).toBe(1024)
  })

  it('可选字段未定义时不写入对应键', () => {
    const body = buildChatRequestBody(
      mockRequest({ messages: [{ role: 'user', content: 'hi' }] })
    )

    expect(body).not.toHaveProperty('temperature')
    expect(body).not.toHaveProperty('top_p')
    expect(body).not.toHaveProperty('max_completion_tokens')
  })

  it('messages 缺失时抛出 status=400 错误', () => {
    expect(() => buildChatRequestBody(mockRequest({}))).toThrow(
      expect.objectContaining({
        status: 400,
        message: expect.stringContaining('messages'),
      })
    )
  })

  it('messages 为空数组时抛出 status=400 错误', () => {
    expect(() =>
      buildChatRequestBody(mockRequest({ messages: [] }))
    ).toThrow(
      expect.objectContaining({
        status: 400,
      })
    )
  })

  it('messages 非数组时抛出 status=400 错误', () => {
    expect(() =>
      buildChatRequestBody(mockRequest({ messages: 'not-an-array' }))
    ).toThrow(
      expect.objectContaining({
        status: 400,
      })
    )
  })

  it('抛出的错误信息明确指出 messages 必填', () => {
    expect(() => buildChatRequestBody(mockRequest({}))).toThrow(
      /messages is required/i
    )
  })
})
