export interface OpenAIImage2RequestBody {
  model: string
  prompt: string
  n: number
  size: string
  quality: string
  background: string
  output_format: string
  moderation: string
}

export interface OpenAIImage2ResponseDataItem {
  b64_json?: string
  base64?: string
}

export interface OpenAIImage2ResponseBody {
  created?: number
  data?: OpenAIImage2ResponseDataItem[]
  background?: string
  output_format?: string
  quality?: string
  size?: string
  model?: string
  usage?: Record<string, unknown>
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

const readString = (record: Record<string, unknown>, key: string): string | undefined => {
  const value = record[key]
  return typeof value === 'string' ? value : undefined
}

const readNumber = (record: Record<string, unknown>, key: string): number | undefined => {
  const value = record[key]
  return typeof value === 'number' ? value : undefined
}

export function parseOpenAIImage2Response(value: unknown): OpenAIImage2ResponseBody {
  if (!isRecord(value)) return {}

  const rawData = Array.isArray(value.data) ? value.data : []
  const data = rawData
    .filter(isRecord)
    .map((item) => ({
      b64_json: readString(item, 'b64_json'),
      base64: readString(item, 'base64'),
    }))

  return {
    created: readNumber(value, 'created'),
    data,
    background: readString(value, 'background'),
    output_format: readString(value, 'output_format'),
    quality: readString(value, 'quality'),
    size: readString(value, 'size'),
    model: readString(value, 'model'),
    usage: isRecord(value.usage) ? value.usage : undefined,
  }
}

export function buildOpenAIImage2Url(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/v1/images/generations`
}

export function base64ToBlob(base64: string, mimeType: string): Blob {
  const cleanBase64 = base64.includes(',') ? base64.split(',').at(-1) ?? '' : base64
  const binary = window.atob(cleanBase64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return new Blob([bytes], { type: mimeType })
}

export function extractImageBase64List(response: OpenAIImage2ResponseBody): string[] {
  return (response.data ?? [])
    .map((item) => item.b64_json ?? item.base64)
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
}

export function createOpenAIImage2RequestSummary(body: OpenAIImage2RequestBody): Record<string, unknown> {
  return {
    model: body.model,
    prompt_length: body.prompt.length,
    image_count: body.n,
    size: body.size,
    quality: body.quality,
    background: body.background,
    output_format: body.output_format,
    moderation: body.moderation,
  }
}

export function createOpenAIImage2ResponseSummary(response: OpenAIImage2ResponseBody): Record<string, unknown> {
  return {
    created: response.created,
    model: response.model,
    size: response.size,
    quality: response.quality,
    background: response.background,
    output_format: response.output_format,
    image_count: extractImageBase64List(response).length,
    usage: response.usage,
  }
}
