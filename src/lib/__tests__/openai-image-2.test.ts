import { describe, expect, it } from 'vitest'
import {
  parseOpenAIImage2Response,
  buildOpenAIImage2Url,
  extractImageBase64List,
  createOpenAIImage2RequestSummary,
  createOpenAIImage2ResponseSummary,
  type OpenAIImage2RequestBody,
  type OpenAIImage2ResponseBody,
} from '../openai-image-2'

describe('parseOpenAIImage2Response', () => {
  it('返回空对象当输入不是 Record', () => {
    expect(parseOpenAIImage2Response(null)).toEqual({})
    expect(parseOpenAIImage2Response(undefined)).toEqual({})
    expect(parseOpenAIImage2Response('string')).toEqual({})
    expect(parseOpenAIImage2Response(42)).toEqual({})
    expect(parseOpenAIImage2Response([1, 2])).toEqual({})
  })

  it('解析完整的响应体', () => {
    const input = {
      created: 1714000000,
      data: [
        { b64_json: 'abc123' },
        { base64: 'def456' },
      ],
      background: 'transparent',
      output_format: 'png',
      quality: 'high',
      size: '1024x1024',
      model: 'gpt-image-1',
      usage: { total_tokens: 100 },
    }
    const result = parseOpenAIImage2Response(input)
    expect(result.created).toBe(1714000000)
    expect(result.data).toHaveLength(2)
    expect(result.data?.[0].b64_json).toBe('abc123')
    expect(result.data?.[1].base64).toBe('def456')
    expect(result.background).toBe('transparent')
    expect(result.output_format).toBe('png')
    expect(result.quality).toBe('high')
    expect(result.size).toBe('1024x1024')
    expect(result.model).toBe('gpt-image-1')
    expect(result.usage).toEqual({ total_tokens: 100 })
  })

  it('过滤非 Record 类型的 data 元素', () => {
    const input = {
      data: [
        { b64_json: 'valid' },
        'not-a-record',
        null,
        { base64: 'also-valid' },
      ],
    }
    const result = parseOpenAIImage2Response(input)
    expect(result.data).toHaveLength(2)
  })

  it('跳过非字符串类型的字段', () => {
    const input = {
      created: 'not-a-number',
      model: 123,
      size: null,
    }
    const result = parseOpenAIImage2Response(input)
    expect(result.created).toBeUndefined()
    expect(result.model).toBeUndefined()
    expect(result.size).toBeUndefined()
  })

  it('usage 非 Record 时返回 undefined', () => {
    const input = { usage: 'not-a-record' }
    const result = parseOpenAIImage2Response(input)
    expect(result.usage).toBeUndefined()
  })
})

describe('buildOpenAIImage2Url', () => {
  it('拼接标准 URL', () => {
    expect(buildOpenAIImage2Url('https://mikuapi.org')).toBe('https://mikuapi.org/v1/images/generations')
  })

  it('去除尾部斜杠后拼接', () => {
    expect(buildOpenAIImage2Url('https://mikuapi.org/')).toBe('https://mikuapi.org/v1/images/generations')
    expect(buildOpenAIImage2Url('https://mikuapi.org///')).toBe('https://mikuapi.org/v1/images/generations')
  })

  it('支持自定义 base URL', () => {
    expect(buildOpenAIImage2Url('https://custom.api.com')).toBe('https://custom.api.com/v1/images/generations')
  })
})

describe('extractImageBase64List', () => {
  it('提取 b64_json 和 base64 字段', () => {
    const response: OpenAIImage2ResponseBody = {
      data: [
        { b64_json: 'abc' },
        { base64: 'def' },
        { b64_json: 'ghi', base64: 'jkl' },
      ],
    }
    expect(extractImageBase64List(response)).toEqual(['abc', 'def', 'ghi'])
  })

  it('过滤空字符串和 undefined', () => {
    const response: OpenAIImage2ResponseBody = {
      data: [
        { b64_json: '' },
        { base64: undefined },
        {},
      ],
    }
    expect(extractImageBase64List(response)).toEqual([])
  })

  it('data 为空时返回空数组', () => {
    expect(extractImageBase64List({})).toEqual([])
    expect(extractImageBase64List({ data: [] })).toEqual([])
  })
})

describe('createOpenAIImage2RequestSummary', () => {
  it('生成请求摘要，不含 prompt 原文', () => {
    const body: OpenAIImage2RequestBody = {
      model: 'gpt-image-1',
      prompt: 'A long prompt with sensitive information',
      n: 2,
      size: '1024x1024',
      quality: 'high',
      background: 'transparent',
      output_format: 'png',
      moderation: 'auto',
    }
    const summary = createOpenAIImage2RequestSummary(body)
    expect(summary.model).toBe('gpt-image-1')
    expect(summary.prompt_length).toBe('A long prompt with sensitive information'.length)
    expect(summary.image_count).toBe(2)
    expect(summary).not.toHaveProperty('prompt')
  })
})

describe('createOpenAIImage2ResponseSummary', () => {
  it('生成响应摘要，不含 base64 数据', () => {
    const response: OpenAIImage2ResponseBody = {
      created: 1714000000,
      model: 'gpt-image-1',
      size: '1024x1024',
      quality: 'high',
      background: 'transparent',
      output_format: 'png',
      data: [
        { b64_json: 'very-long-base64-data' },
        { base64: 'another-long-base64' },
      ],
      usage: { total_tokens: 200 },
    }
    const summary = createOpenAIImage2ResponseSummary(response)
    expect(summary.image_count).toBe(2)
    expect(summary.model).toBe('gpt-image-1')
    expect(summary.created).toBe(1714000000)
    expect(JSON.stringify(summary)).not.toContain('very-long-base64')
    expect(JSON.stringify(summary)).not.toContain('another-long-base64')
  })

  it('data 为空时 image_count 为 0', () => {
    const summary = createOpenAIImage2ResponseSummary({})
    expect(summary.image_count).toBe(0)
  })
})
