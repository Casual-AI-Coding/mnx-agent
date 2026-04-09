/**
 * Route Helper Utilities
 * 
 * Common utilities to reduce route handler duplication.
 * These functions handle repetitive patterns like 404 checks,
 * JSON parsing, and pagination responses.
 */

import { Response } from 'express'

/**
 * Handles the "entity not found" pattern.
 * Returns null if entity is null/undefined, sending 404 response.
 * 
 * @example
 * const record = await db.getById(id, ownerId)
 * if (!withEntityNotFound(record, res, 'Media record')) return
 * // record is now typed as NonNullable<typeof record>
 * successResponse(res, record)
 */
export function withEntityNotFound<T>(
  entity: T | null | undefined,
  res: Response,
  entityName: string = 'Entity'
): entity is T {
  if (entity === null || entity === undefined) {
    res.status(404).json({
      success: false,
      error: `${entityName} not found`,
    })
    return false
  }
  return true
}

/**
 * Parses a JSON string field, sending 400 response on error.
 * Returns null if parsing fails.
 * 
 * @example
 * const parsed = parseJsonField(req.body.nodes_json, res, 'nodes_json')
 * if (!parsed) return
 * // parsed is now the parsed object
 */
export function parseJsonField<T = unknown>(
  jsonString: string | undefined | null,
  res: Response,
  fieldName: string = 'JSON field'
): T | null {
  if (!jsonString) {
    return null
  }
  
  try {
    return JSON.parse(jsonString) as T
  } catch {
    res.status(400).json({
      success: false,
      error: `${fieldName} must be valid JSON`,
    })
    return null
  }
}

/**
 * Pagination query parameters
 */
export interface PaginationParams {
  page: number
  limit: number
  offset: number
}

/**
 * Extracts pagination parameters from query.
 * Applies defaults and bounds checking.
 * 
 * @example
 * const { page, limit, offset } = getPaginationParams(req.query)
 */
export function getPaginationParams(
  query: Record<string, unknown>,
  defaults: { page?: number; limit?: number } = {}
): PaginationParams {
  const page = Math.max(1, Number(query.page) || defaults.page || 1)
  const limit = Math.min(100, Math.max(1, Number(query.limit) || defaults.limit || 20))
  const offset = (page - 1) * limit
  
  return { page, limit, offset }
}

/**
 * Pagination response shape
 */
export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

/**
 * Creates pagination metadata from total count and params.
 * 
 * @example
 * const pagination = createPaginationMeta(total, page, limit)
 */
export function createPaginationMeta(
  total: number,
  page: number,
  limit: number
): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  records: T[]
  pagination: PaginationMeta
}

/**
 * Creates a standard paginated response object.
 * 
 * @example
 * const response = createPaginatedResponse(records, total, page, limit)
 * successResponse(res, response)
 * 
 * // With custom key:
 * const response = createPaginatedResponse(templates, total, page, limit, 'templates')
 */
export function createPaginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
  itemsKey: string = 'records'
): Record<string, T[] | PaginationMeta> {
  return {
    [itemsKey]: items,
    pagination: createPaginationMeta(total, page, limit),
  }
}