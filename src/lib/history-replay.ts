import type { AuditLog } from '@/lib/api/audit'

export interface HistoryReplaySnapshot {
  readonly source: 'history' | 'audit'
  readonly label: string
  readonly routePath: `/${string}`
  readonly formPersistenceKey: string
  readonly formData: Record<string, unknown>
}

const SENSITIVE_FIELD_NAMES = new Set([
  'api_key',
  'apiKey',
  'authorization',
  'password',
  'token',
  'accessToken',
  'refreshToken',
])

export interface CreateHistoryReplaySnapshotInput {
  readonly label: string
  readonly routePath: `/${string}`
  readonly formPersistenceKey: string
  readonly formData: Record<string, unknown>
}

interface HistoryItemWithOptionalReplay {
  readonly replaySnapshot?: HistoryReplaySnapshot | null
}

interface ReplayableHistoryItem {
  readonly replaySnapshot: HistoryReplaySnapshot
}

export function applyHistoryReplaySnapshot(snapshot: HistoryReplaySnapshot): string {
  window.localStorage.setItem(
    `form-persistence:${snapshot.formPersistenceKey}`,
    JSON.stringify(snapshot.formData)
  )
  return snapshot.routePath
}

export function createHistoryReplaySnapshot(
  input: CreateHistoryReplaySnapshotInput
): HistoryReplaySnapshot {
  return {
    source: 'history',
    label: input.label,
    routePath: input.routePath,
    formPersistenceKey: input.formPersistenceKey,
    formData: input.formData,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function containsSensitiveField(value: unknown): boolean {
  if (!isRecord(value)) return false

  return Object.entries(value).some(([key, nestedValue]) => {
    if (SENSITIVE_FIELD_NAMES.has(key)) return true
    return containsSensitiveField(nestedValue)
  })
}

function parseRequestBody(log: AuditLog): Record<string, unknown> | null {
  const body = log.request_body
  if (isRecord(body)) return body
  if (typeof body !== 'string') return null

  try {
    const parsed: unknown = JSON.parse(body)
    return isRecord(parsed) ? parsed : null
  } catch {
    return null
  }
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key]
  return typeof value === 'string' ? value : undefined
}

function readNumber(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key]
  return typeof value === 'number' ? value : undefined
}

function readBoolean(record: Record<string, unknown>, key: string): boolean | undefined {
  const value = record[key]
  return typeof value === 'boolean' ? value : undefined
}

export function createAuditReplaySnapshot(log: AuditLog): HistoryReplaySnapshot | null {
  if (log.request_method !== 'POST') return null

  const body = parseRequestBody(log)
  if (!body || containsSensitiveField(body)) return null

  if (log.request_path === '/api/image/generate') {
    const prompt = readString(body, 'prompt') ?? ''
    const model = readString(body, 'model') ?? 'image-01'
    const aspectRatio = readString(body, 'aspect_ratio') ?? '1:1'
    const numImages = readNumber(body, 'n') ?? 1
    const seed = readNumber(body, 'seed')
    const promptOptimizer = readBoolean(body, 'prompt_optimizer') ?? false
    const aigcWatermark = readBoolean(body, 'aigc_watermark') ?? false

    return {
      source: 'audit',
      label: '审计日志图片参数',
      routePath: '/image',
      formPersistenceKey: 'image-generation',
      formData: {
        prompt,
        model,
        aspectRatioState: { type: 'preset', preset: aspectRatio },
        numImages,
        referenceImageMode: 'upload',
        referenceImageUrl: '',
        seed,
        promptOptimizer,
        aigcWatermark,
        imageTitle: '',
        parallelCount: 1,
      },
    }
  }

  return null
}

export function canReplayHistoryItem<T extends HistoryItemWithOptionalReplay>(
  item: T
): item is T & ReplayableHistoryItem {
  return item.replaySnapshot !== undefined && item.replaySnapshot !== null
}
