import { v4 as uuidv4 } from 'uuid'
import { BaseRepository } from './base-repository.js'
import type {
  PromptRecord,
  PromptRecordRow,
} from '../database/types.js'
import type { DatabaseConnection } from '../database/connection.js'
import { toLocalISODateString } from '../lib/date-utils.js'

interface PromptTargetFilter {
  targetType: PromptRecord['target_type']
  targetId: string
  slotType: PromptRecord['slot_type']
  ownerId: string
}

interface CreatePromptParams {
  targetType: PromptRecord['target_type']
  targetId: string
  slotType: PromptRecord['slot_type']
  name: string
  content: string
  ownerId: string
  sortOrder?: number
  isDefault?: boolean
}

interface UpdatePromptParams {
  name?: string
  content?: string
  sort_order?: number
  is_default?: boolean
}

interface ReorderPromptItem {
  id: string
  sort_order: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeTimestamp(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null
  }
  if (typeof value === 'string') {
    return value
  }
  if (value instanceof Date) {
    return value.toISOString()
  }
  return String(value)
}

function normalizeNumber(value: unknown): number {
  if (typeof value === 'number') {
    return value
  }
  if (typeof value === 'string') {
    return parseInt(value, 10)
  }
  return 0
}

function normalizeBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value
  }
  if (typeof value === 'number') {
    return value === 1
  }
  return false
}

function toPromptRecord(row: PromptRecordRow): PromptRecord {
  return {
    ...row,
    sort_order: normalizeNumber(row.sort_order),
    is_default: normalizeBoolean(row.is_default),
    is_deleted: normalizeBoolean(row.is_deleted),
    created_at: normalizeTimestamp(row.created_at) ?? '',
    updated_at: normalizeTimestamp(row.updated_at) ?? '',
    deleted_at: normalizeTimestamp(row.deleted_at),
  }
}

function isPromptRecordRow(value: unknown): value is PromptRecordRow {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.id === 'string' &&
    typeof value.target_type === 'string' &&
    typeof value.target_id === 'string' &&
    typeof value.slot_type === 'string' &&
    typeof value.name === 'string' &&
    typeof value.content === 'string' &&
    typeof value.owner_id === 'string' &&
    value.sort_order !== undefined &&
    value.created_at !== undefined &&
    value.updated_at !== undefined
  )
}

export class PromptRepository extends BaseRepository<PromptRecord> {
  protected readonly tableName = 'prompts'

  constructor(conn: DatabaseConnection) {
    super({ conn })
  }

  protected getIdColumn(): string {
    return 'id'
  }

  protected rowToEntity(row: unknown): PromptRecord {
    if (!isPromptRecordRow(row)) {
      throw new Error('Invalid prompt row')
    }
    return toPromptRecord(row)
  }

  async getById(id: string, ownerId?: string): Promise<PromptRecord | null> {
    if (ownerId) {
      const rows = await this.conn.query<PromptRecordRow>(
        `SELECT * FROM prompts WHERE id = $1 AND owner_id = $2 AND is_deleted = false`,
        [id, ownerId]
      )
      return rows[0] ? this.rowToEntity(rows[0]) : null
    }

    const rows = await this.conn.query<PromptRecordRow>(
      `SELECT * FROM prompts WHERE id = $1 AND is_deleted = false`,
      [id]
    )
    return rows[0] ? this.rowToEntity(rows[0]) : null
  }

  private async clearDefaultInScope(
    conn: DatabaseConnection,
    scope: PromptTargetFilter,
    excludePromptId?: string
  ): Promise<void> {
    const now = toLocalISODateString()

    if (excludePromptId) {
      await conn.execute(
        `UPDATE prompts
         SET is_default = $1, updated_at = $2
         WHERE target_type = $3 AND target_id = $4 AND slot_type = $5
           AND owner_id = $6 AND is_deleted = false AND id != $7`,
        [
          false,
          now,
          scope.targetType,
          scope.targetId,
          scope.slotType,
          scope.ownerId,
          excludePromptId,
        ]
      )
      return
    }

    await conn.execute(
      `UPDATE prompts
       SET is_default = $1, updated_at = $2
       WHERE target_type = $3 AND target_id = $4 AND slot_type = $5
         AND owner_id = $6 AND is_deleted = false`,
      [false, now, scope.targetType, scope.targetId, scope.slotType, scope.ownerId]
    )
  }

  private async promoteNextDefault(conn: DatabaseConnection, scope: PromptTargetFilter): Promise<void> {
    const candidates = await conn.query<PromptRecordRow>(
      `SELECT * FROM prompts
       WHERE target_type = $1 AND target_id = $2 AND slot_type = $3
         AND owner_id = $4 AND is_deleted = false
       ORDER BY sort_order ASC, created_at ASC
       LIMIT 1`,
      [scope.targetType, scope.targetId, scope.slotType, scope.ownerId]
    )

    const next = candidates[0]
    if (!next) {
      return
    }

    await conn.execute(
      `UPDATE prompts SET is_default = $1, updated_at = $2 WHERE id = $3`,
      [true, toLocalISODateString(), next.id]
    )
  }

  async create(data: CreatePromptParams): Promise<PromptRecord> {
    const id = uuidv4()
    const now = toLocalISODateString()
    const shouldSetDefault = data.isDefault === true

    await this.conn.transaction(async (txConn) => {
      if (shouldSetDefault) {
        await this.clearDefaultInScope(txConn, {
          targetType: data.targetType,
          targetId: data.targetId,
          slotType: data.slotType,
          ownerId: data.ownerId,
        })
      }

      await txConn.execute(
        `INSERT INTO prompts (
          id, target_type, target_id, slot_type, name, content,
          sort_order, is_default, owner_id, is_deleted,
          created_at, updated_at, deleted_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          id,
          data.targetType,
          data.targetId,
          data.slotType,
          data.name,
          data.content,
          data.sortOrder ?? 0,
          shouldSetDefault,
          data.ownerId,
          false,
          now,
          now,
          null,
        ]
      )

      return undefined
    })

    const created = await this.getById(id, data.ownerId)
    if (!created) {
      throw new Error('Failed to create prompt')
    }
    return created
  }

  async listByTarget(filter: PromptTargetFilter): Promise<PromptRecord[]> {
    const rows = await this.conn.query<PromptRecordRow>(
      `SELECT * FROM prompts
       WHERE target_type = $1 AND target_id = $2 AND slot_type = $3
         AND owner_id = $4 AND is_deleted = false
       ORDER BY sort_order ASC, created_at ASC`,
      [filter.targetType, filter.targetId, filter.slotType, filter.ownerId]
    )

    return rows.map((row) => this.rowToEntity(row))
  }

  async update(id: string, data: UpdatePromptParams, ownerId: string): Promise<PromptRecord | null> {
    const existing = await this.getById(id, ownerId)
    if (!existing || existing.is_deleted) {
      return null
    }

    await this.conn.transaction(async (txConn) => {
      if (data.is_default === true) {
        await this.clearDefaultInScope(
          txConn,
          {
            targetType: existing.target_type,
            targetId: existing.target_id,
            slotType: existing.slot_type,
            ownerId,
          },
          id
        )
      }

      const fields: string[] = []
      const values: Array<string | number | boolean | null> = []
      let paramIndex = 1

      if (data.name !== undefined) {
        fields.push(`name = $${paramIndex}`)
        values.push(data.name)
        paramIndex += 1
      }
      if (data.content !== undefined) {
        fields.push(`content = $${paramIndex}`)
        values.push(data.content)
        paramIndex += 1
      }
      if (data.sort_order !== undefined) {
        fields.push(`sort_order = $${paramIndex}`)
        values.push(data.sort_order)
        paramIndex += 1
      }
      if (data.is_default !== undefined) {
        fields.push(`is_default = $${paramIndex}`)
        values.push(data.is_default)
        paramIndex += 1
      }

      if (fields.length === 0) {
        return undefined
      }

      fields.push(`updated_at = $${paramIndex}`)
      values.push(toLocalISODateString())
      paramIndex += 1
      values.push(id)
      values.push(ownerId)

      await txConn.execute(
        `UPDATE prompts
         SET ${fields.join(', ')}
         WHERE id = $${paramIndex} AND owner_id = $${paramIndex + 1} AND is_deleted = false`,
        values
      )

      return undefined
    })

    return this.getById(id, ownerId)
  }

  async setDefault(id: string, ownerId: string): Promise<PromptRecord | null> {
    return this.conn.transaction(async (txConn) => {
      const rows = await txConn.query<PromptRecordRow>(
        `SELECT * FROM prompts WHERE id = $1 AND owner_id = $2 AND is_deleted = false`,
        [id, ownerId]
      )
      const target = rows[0]
      if (!target) {
        return null
      }

      const scope: PromptTargetFilter = {
        targetType: target.target_type,
        targetId: target.target_id,
        slotType: target.slot_type,
        ownerId,
      }

      await this.clearDefaultInScope(txConn, scope, id)
      await txConn.execute(
        `UPDATE prompts SET is_default = $1, updated_at = $2 WHERE id = $3`,
        [true, toLocalISODateString(), id]
      )

      const updatedRows = await txConn.query<PromptRecordRow>(
        `SELECT * FROM prompts WHERE id = $1 AND owner_id = $2`,
        [id, ownerId]
      )

      const updated = updatedRows[0]
      return updated ? this.rowToEntity(updated) : null
    })
  }

  async softDelete(id: string, ownerId: string): Promise<boolean> {
    return this.conn.transaction(async (txConn) => {
      const rows = await txConn.query<PromptRecordRow>(
        `SELECT * FROM prompts WHERE id = $1 AND owner_id = $2 AND is_deleted = false`,
        [id, ownerId]
      )
      const existing = rows[0]
      if (!existing) {
        return false
      }

      const now = toLocalISODateString()
      await txConn.execute(
        `UPDATE prompts
         SET is_deleted = $1, deleted_at = $2, is_default = $3, updated_at = $2
         WHERE id = $4 AND owner_id = $5 AND is_deleted = false`,
        [true, now, false, id, ownerId]
      )

      if (normalizeBoolean(existing.is_default)) {
        await this.promoteNextDefault(txConn, {
          targetType: existing.target_type,
          targetId: existing.target_id,
          slotType: existing.slot_type,
          ownerId,
        })
      }

      return true
    })
  }

  async reorder(filter: PromptTargetFilter, items: ReorderPromptItem[]): Promise<void> {
    if (items.length === 0) {
      return
    }

    const ids = items.map((item) => item.id)
    const matchResult = await this.conn.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM prompts
       WHERE id = ANY($1) AND target_type = $2 AND target_id = $3 AND slot_type = $4
         AND owner_id = $5 AND is_deleted = false`,
      [ids, filter.targetType, filter.targetId, filter.slotType, filter.ownerId]
    )
    const matchedCount = Number(matchResult[0].count)
    if (matchedCount !== items.length) {
      throw new Error('not all items matched')
    }

    await this.conn.transaction(async (txConn) => {
      for (const item of items) {
        await txConn.execute(
          `UPDATE prompts
           SET sort_order = $1, updated_at = $2
           WHERE id = $3 AND target_type = $4 AND target_id = $5 AND slot_type = $6
             AND owner_id = $7 AND is_deleted = false`,
          [
            item.sort_order,
            toLocalISODateString(),
            item.id,
            filter.targetType,
            filter.targetId,
            filter.slotType,
            filter.ownerId,
          ]
        )
      }

      return undefined
    })
  }
}
