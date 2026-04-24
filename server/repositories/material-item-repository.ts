import { v4 as uuidv4 } from 'uuid'
import { BaseRepository } from './base-repository.js'
import type {
  MaterialItem,
  MaterialItemRow,
} from '../database/types.js'
import type { DatabaseConnection } from '../database/connection.js'
import { toLocalISODateString } from '../lib/date-utils.js'

interface CreateMaterialItemParams {
  ownerId: string
  material_id: string
  item_type: MaterialItem['item_type']
  name: string
  lyrics?: string | null
  remark?: string | null
  metadata?: Record<string, unknown> | null
  sort_order?: number
}

interface UpdateMaterialItemParams {
  name?: string
  lyrics?: string | null
  remark?: string | null
  metadata?: Record<string, unknown> | null
  sort_order?: number
}

interface MaterialItemUpdateRow {
  name?: string
  lyrics?: string | null
  remark?: string | null
  metadata?: string | null
  sort_order?: number
}

interface ReorderItem {
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

function normalizeMetadata(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null
  }
  if (typeof value === 'string') {
    return value
  }
  return JSON.stringify(value)
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

function toMaterialItem(row: MaterialItemRow): MaterialItem {
  return {
    ...row,
    metadata: normalizeMetadata(row.metadata),
    sort_order: normalizeNumber(row.sort_order),
    is_deleted: normalizeBoolean(row.is_deleted),
    created_at: normalizeTimestamp(row.created_at) ?? '',
    updated_at: normalizeTimestamp(row.updated_at) ?? '',
    deleted_at: normalizeTimestamp(row.deleted_at),
  }
}

function isMaterialItemRow(value: unknown): value is MaterialItemRow {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.id === 'string' &&
    typeof value.material_id === 'string' &&
    typeof value.item_type === 'string' &&
    typeof value.name === 'string' &&
    typeof value.owner_id === 'string' &&
    value.sort_order !== undefined &&
    value.created_at !== undefined &&
    value.updated_at !== undefined
  )
}

export class MaterialItemRepository extends BaseRepository<MaterialItem> {
  protected readonly tableName = 'material_items'

  constructor(conn: DatabaseConnection) {
    super({ conn })
  }

  protected getIdColumn(): string {
    return 'id'
  }

  protected rowToEntity(row: unknown): MaterialItem {
    if (!isMaterialItemRow(row)) {
      throw new Error('Invalid material item row')
    }
    return toMaterialItem(row)
  }

  async getById(id: string, ownerId?: string): Promise<MaterialItem | null> {
    if (ownerId) {
      const rows = await this.conn.query<MaterialItemRow>(
        `SELECT * FROM material_items WHERE id = $1 AND owner_id = $2 AND is_deleted = false`,
        [id, ownerId]
      )
      return rows[0] ? this.rowToEntity(rows[0]) : null
    }

    const rows = await this.conn.query<MaterialItemRow>(
      `SELECT * FROM material_items WHERE id = $1 AND is_deleted = false`,
      [id]
    )
    return rows[0] ? this.rowToEntity(rows[0]) : null
  }

  async create(data: CreateMaterialItemParams): Promise<MaterialItem> {
    const id = uuidv4()
    const now = toLocalISODateString()

    await this.conn.execute(
      `INSERT INTO material_items (
        id, material_id, item_type, name, lyrics, remark, metadata, owner_id,
        sort_order, is_deleted, created_at, updated_at, deleted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        id,
        data.material_id,
        data.item_type,
        data.name,
        data.lyrics ?? null,
        data.remark ?? null,
        data.metadata ? JSON.stringify(data.metadata) : null,
        data.ownerId,
        data.sort_order ?? 0,
        false,
        now,
        now,
        null,
      ]
    )

    const item = await this.getById(id, data.ownerId)
    if (!item) {
      throw new Error('Failed to create material item')
    }
    return item
  }

  async listByMaterial(materialId: string, ownerId: string): Promise<MaterialItem[]> {
    const rows = await this.conn.query<MaterialItemRow>(
      `SELECT * FROM material_items
       WHERE material_id = $1 AND owner_id = $2 AND is_deleted = false
       ORDER BY sort_order ASC, created_at ASC`,
      [materialId, ownerId]
    )
    return rows.map((row) => this.rowToEntity(row))
  }

  async update(id: string, data: UpdateMaterialItemParams, ownerId: string): Promise<MaterialItem | null> {
    const updates: MaterialItemUpdateRow = {
      name: data.name,
      lyrics: data.lyrics,
      remark: data.remark,
      sort_order: data.sort_order,
    }

    if (data.metadata !== undefined) {
      updates.metadata = data.metadata ? JSON.stringify(data.metadata) : null
    }

    return this.executeUpdate(updates, id, ownerId)
  }

  async softDelete(id: string, ownerId: string): Promise<boolean> {
    const now = toLocalISODateString()
    const result = await this.conn.execute(
      `UPDATE material_items
       SET is_deleted = $1, deleted_at = $2, updated_at = $2
       WHERE id = $3 AND owner_id = $4 AND is_deleted = false`,
      [true, now, id, ownerId]
    )
    return result.changes > 0
  }

  async reorder(materialId: string, reorderItems: ReorderItem[], ownerId: string): Promise<void> {
    if (reorderItems.length === 0) {
      return
    }

    const ids = reorderItems.map((item) => item.id)
    const matchResult = await this.conn.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM material_items
       WHERE id = ANY($1) AND material_id = $2 AND owner_id = $3 AND is_deleted = false`,
      [ids, materialId, ownerId]
    )
    const matchedCount = Number(matchResult[0].count)
    if (matchedCount !== reorderItems.length) {
      throw new Error('not all items matched')
    }

    await this.conn.transaction(async (txConn) => {
      for (const item of reorderItems) {
        await txConn.execute(
          `UPDATE material_items
           SET sort_order = $1, updated_at = $2
           WHERE id = $3 AND material_id = $4 AND owner_id = $5 AND is_deleted = false`,
          [item.sort_order, toLocalISODateString(), item.id, materialId, ownerId]
        )
      }
      return undefined
    })
  }
}
