import type { MediaRecord } from '../../database/types.js'

export interface BatchPublicPlanInput {
  readonly requestedIds: readonly string[]
  readonly records: readonly MediaRecord[]
  readonly userId?: string
  readonly userRole?: string
}

export interface BatchPublicResult {
  readonly id: string
  readonly success: boolean
  readonly error?: string
}

export interface BatchPublicPlan {
  readonly authorizedIds: readonly string[]
  readonly results: readonly BatchPublicResult[]
}

export interface BatchDownloadPlanInput {
  readonly requestedIds: readonly string[]
  readonly records: readonly MediaRecord[]
  readonly timestamp: number
}

export interface BatchDownloadInaccessibleSummary {
  readonly requestedCount: number
  readonly accessibleCount: number
}

export interface BatchDownloadPlan {
  readonly archiveFilename: string
  readonly records: readonly MediaRecord[]
  readonly inaccessibleSummary?: BatchDownloadInaccessibleSummary
}

export interface BatchDeleteValidationInput {
  readonly requestedIds: readonly string[]
  readonly records: readonly MediaRecord[]
}

export type BatchDeleteValidationResult =
  | { readonly ok: true; readonly records: readonly MediaRecord[] }
  | { readonly ok: false; readonly statusCode: 404; readonly error: string }

const NOT_AUTHORIZED_OR_NOT_FOUND = 'Not authorized or not found'

function canSetPublic(record: MediaRecord, input: Pick<BatchPublicPlanInput, 'userId' | 'userRole'>): boolean {
  const isOwner = record.owner_id === input.userId
  const isSuperWithNoOwner = !record.owner_id && input.userRole === 'super'
  return isOwner || isSuperWithNoOwner
}

export function buildBatchPublicPlan(input: BatchPublicPlanInput): BatchPublicPlan {
  const recordMap = new Map(input.records.map(record => [record.id, record]))
  const authorizedIds: string[] = []
  const failureResults: BatchPublicResult[] = []

  for (const id of input.requestedIds) {
    const record = recordMap.get(id)
    if (!record || record.is_deleted || !canSetPublic(record, input)) {
      failureResults.push({ id, success: false, error: NOT_AUTHORIZED_OR_NOT_FOUND })
      continue
    }

    authorizedIds.push(id)
  }

  return {
    authorizedIds,
    results: [
      ...failureResults,
      ...authorizedIds.map(id => ({ id, success: true })),
    ],
  }
}

export function buildBatchDownloadPlan(input: BatchDownloadPlanInput): BatchDownloadPlan {
  const inaccessibleSummary = input.records.length === input.requestedIds.length
    ? undefined
    : {
        requestedCount: input.requestedIds.length,
        accessibleCount: input.records.length,
      }

  return {
    archiveFilename: `media_batch_${input.timestamp}.zip`,
    records: input.records,
    inaccessibleSummary,
  }
}

export function validateBatchDeleteRecords(input: BatchDeleteValidationInput): BatchDeleteValidationResult {
  const foundIds = new Set(input.records.map(record => record.id))
  const missingId = input.requestedIds.find(id => !foundIds.has(id))
  if (missingId) {
    return { ok: false, statusCode: 404, error: `Media record not found: ${missingId}` }
  }

  const deletedRecord = input.records.find(record => record.is_deleted)
  if (deletedRecord) {
    return { ok: false, statusCode: 404, error: `Media record already deleted: ${deletedRecord.id}` }
  }

  return { ok: true, records: input.records }
}
