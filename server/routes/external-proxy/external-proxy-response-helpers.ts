import { isRecord } from './external-proxy-media-helpers.js'

export interface ExtractedImagePayload {
  readonly url?: string
  readonly base64?: string
}

export function extractAllImages(data: Record<string, unknown>): ExtractedImagePayload[] {
  const images: ExtractedImagePayload[] = []
  if (!Array.isArray(data.data)) {
    return images
  }

  for (const item of data.data) {
    if (!isRecord(item)) {
      continue
    }
    const url = typeof item.url === 'string' ? item.url : undefined
    const base64 = typeof item.b64_json === 'string' ? item.b64_json : undefined
    if (url || base64) {
      images.push({ url, base64 })
    }
  }

  return images
}

export function stripBase64Images(body: unknown): unknown {
  if (!isRecord(body)) {
    return body
  }

  const cleanedBody: Record<string, unknown> = { ...body }
  if (Array.isArray(cleanedBody.data)) {
    cleanedBody.data = cleanedBody.data.map((item) => {
      if (!isRecord(item) || !('b64_json' in item)) {
        return item
      }
      const cleanedItem: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(item)) {
        if (key !== 'b64_json') {
          cleanedItem[key] = value
        }
      }
      return cleanedItem
    })
  }

  return cleanedBody
}

export function extractErrorMessage(responseBody: unknown, httpStatus: number): string {
  if (isRecord(responseBody)) {
    if (isRecord(responseBody.error) && typeof responseBody.error.message === 'string') {
      return responseBody.error.message
    }

    if (isRecord(responseBody.base_resp) && typeof responseBody.base_resp.status_msg === 'string') {
      return responseBody.base_resp.status_msg
    }

    if (typeof responseBody.error === 'string') {
      return responseBody.error
    }

    if (typeof responseBody.message === 'string') {
      return responseBody.message
    }
  }

  return `HTTP ${httpStatus}`
}

export function toExternalProxyResultData(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) {
    return null
  }
  return value
}
