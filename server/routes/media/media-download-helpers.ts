export interface MediaDownloadPlanInput {
  readonly file: Buffer
  readonly filename: string
  readonly originalName?: string | null
  readonly mimeType?: string | null
  readonly rangeHeader?: string
}

export interface MediaDownloadPlan {
  readonly statusCode: 200 | 206
  readonly headers: Readonly<Record<string, string | number>>
  readonly body: Buffer
}

export interface StreamingDownloadPlanInput {
  readonly fileSize: number
  readonly filename: string
  readonly originalName?: string | null
  readonly mimeType?: string | null
  readonly rangeHeader?: string
}

export interface StreamingRangePlan {
  readonly start: number
  readonly end: number
  readonly length: number
}

export type StreamingDownloadPlan =
  | {
      readonly statusCode: 200
      readonly headers: Readonly<Record<string, string | number>>
      readonly range: null
    }
  | {
      readonly statusCode: 206
      readonly headers: Readonly<Record<string, string | number>>
      readonly range: StreamingRangePlan
    }

interface ByteRange {
  readonly start: number
  readonly end: number
}

interface BaseHeaderInput {
  readonly filename: string
  readonly originalName?: string | null
  readonly mimeType?: string | null
}

function buildBaseHeaders(input: BaseHeaderInput): Record<string, string | number> {
  const displayName = input.originalName || input.filename
  return {
    'Content-Type': input.mimeType || 'application/octet-stream',
    'Content-Disposition': `inline; filename="${displayName}"`,
    'Accept-Ranges': 'bytes',
  }
}

function parseRangeHeader(rangeHeader: string | undefined, fileSize: number): ByteRange | null {
  if (!rangeHeader) {
    return null
  }

  const normalized = rangeHeader.replace(/bytes=/, '')
  const [startText, endText] = normalized.split('-')
  const start = Number.parseInt(startText ?? '', 10)
  if (!Number.isFinite(start)) {
    return null
  }

  const parsedEnd = endText ? Number.parseInt(endText, 10) : fileSize - 1
  if (!Number.isFinite(parsedEnd)) {
    return null
  }

  const end = Math.min(parsedEnd, fileSize - 1)
  if (start < 0 || end < start || start >= fileSize) {
    return null
  }

  return { start, end }
}

export function buildMediaDownloadPlan(input: MediaDownloadPlanInput): MediaDownloadPlan {
  const fileSize = input.file.length
  const baseHeaders = buildBaseHeaders(input)
  const range = parseRangeHeader(input.rangeHeader, fileSize)

  if (!range) {
    return {
      statusCode: 200,
      body: input.file,
      headers: {
        ...baseHeaders,
        'Content-Length': fileSize,
      },
    }
  }

  const chunkSize = range.end - range.start + 1
  return {
    statusCode: 206,
    body: input.file.slice(range.start, range.end + 1),
    headers: {
      ...baseHeaders,
      'Content-Range': `bytes ${range.start}-${range.end}/${fileSize}`,
      'Content-Length': chunkSize,
    },
  }
}

export function buildStreamingDownloadPlan(input: StreamingDownloadPlanInput): StreamingDownloadPlan {
  const baseHeaders = buildBaseHeaders(input)
  const range = parseRangeHeader(input.rangeHeader, input.fileSize)

  if (!range) {
    return {
      statusCode: 200,
      range: null,
      headers: {
        ...baseHeaders,
        'Content-Length': input.fileSize,
      },
    }
  }

  const chunkSize = range.end - range.start + 1
  return {
    statusCode: 206,
    range: { start: range.start, end: range.end, length: chunkSize },
    headers: {
      ...baseHeaders,
      'Content-Range': `bytes ${range.start}-${range.end}/${input.fileSize}`,
      'Content-Length': chunkSize,
    },
  }
}
