import { v4 as uuidv4 } from 'uuid'
import { BaseRepository } from './base-repository.js'
import type {
  Material,
  MaterialRow,
} from '../database/types.js'
import type { DatabaseConnection } from '../database/connection.js'
import { toLocalISODateString } from '../lib/date-utils.js'

interface CreateMaterialParams {
  ownerId: string
  material_type: Material['material_type']
  name: string
  description?: string | null
  metadata?: Record<string, unknown> | null
  sort_order?: number
}

interface UpdateMaterialParams {
  name?: string
  description?: string | null
  metadata?: Record<string, unknown> | null
  sort_order?: number
}

interface MaterialUpdateRow {
  name?: string
  description?: string | null
  metadata?: string | null
  sort_order?: number
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

function toMaterial(row: MaterialRow & { song_count?: number; prompt_variants_count?: number }): Material {
  return {
    ...row,
    metadata: normalizeMetadata(row.metadata),
    sort_order: normalizeNumber(row.sort_order),
    is_deleted: normalizeBoolean(row.is_deleted),
    created_at: normalizeTimestamp(row.created_at) ?? '',
    updated_at: normalizeTimestamp(row.updated_at) ?? '',
    deleted_at: normalizeTimestamp(row.deleted_at),
    songCount: row.song_count !== undefined ? normalizeNumber(row.song_count) : undefined,
    promptVariantsCount:
      row.prompt_variants_count !== undefined ? normalizeNumber(row.prompt_variants_count) : undefined,
  }
}

function isMaterialRow(value: unknown): value is MaterialRow {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.id === 'string' &&
    typeof value.material_type === 'string' &&
    typeof value.name === 'string' &&
    typeof value.owner_id === 'string' &&
    value.sort_order !== undefined &&
    value.created_at !== undefined &&
    value.updated_at !== undefined
  )
}

export class MaterialRepository extends BaseRepository<Material> {
  protected readonly tableName = 'materials'

  constructor(conn: DatabaseConnection) {
    super({ conn })
  }

  protected getIdColumn(): string {
    return 'id'
  }

  protected rowToEntity(row: unknown): Material {
    if (!isMaterialRow(row)) {
      throw new Error('Invalid material row')
    }
    return toMaterial(row)
  }

  async getById(id: string, ownerId?: string): Promise<Material | null> {
    if (ownerId) {
      const rows = await this.conn.query<MaterialRow>(
        `SELECT * FROM materials WHERE id = $1 AND owner_id = $2 AND is_deleted = false`,
        [id, ownerId]
      )
      return rows[0] ? this.rowToEntity(rows[0]) : null
    }

    const rows = await this.conn.query<MaterialRow>(
      `SELECT * FROM materials WHERE id = $1 AND is_deleted = false`,
      [id]
    )
    return rows[0] ? this.rowToEntity(rows[0]) : null
  }

  async create(data: CreateMaterialParams): Promise<Material> {
    const id = uuidv4()
    const now = toLocalISODateString()

    await this.conn.execute(
      `INSERT INTO materials (
        id, material_type, name, description, metadata, owner_id, sort_order,
        is_deleted, created_at, updated_at, deleted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        id,
        data.material_type,
        data.name,
        data.description ?? null,
        data.metadata ? JSON.stringify(data.metadata) : null,
        data.ownerId,
        data.sort_order ?? 0,
        false,
        now,
        now,
        null,
      ]
    )

    const material = await this.getById(id, data.ownerId)
    if (!material) {
      throw new Error('Failed to create material')
    }
    return material
  }

  async listByType(
    materialType: Material['material_type'],
    ownerId: string,
    limit = 50,
    offset = 0
  ): Promise<{ items: Material[]; total: number }> {
    return this.list({
      ownerId,
      material_type: materialType,
      is_deleted: false,
      limit,
      offset,
    })
  }

  async update(id: string, data: UpdateMaterialParams, ownerId: string): Promise<Material | null> {
    const updates: MaterialUpdateRow = {
      name: data.name,
      description: data.description,
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
      `UPDATE materials
       SET is_deleted = $1, deleted_at = $2, updated_at = $2
       WHERE id = $3 AND owner_id = $4 AND is_deleted = false`,
      [true, now, id, ownerId]
    )
    return result.changes > 0
  }

  async listWithItemCount(filter: {
    ownerId?: string
    materialType?: Material['material_type']
    limit?: number
    offset?: number
  }): Promise<{ items: Material[]; total: number }> {
    const { ownerId, materialType, limit = 50, offset = 0 } = filter

    const conditions: string[] = ['m.is_deleted = false']
    const params: unknown[] = []

    if (ownerId) {
      params.push(ownerId)
      conditions.push(`m.owner_id = $${params.length}`)
    }

    if (materialType) {
      params.push(materialType)
      conditions.push(`m.material_type = $${params.length}`)
    }

    const whereClause = conditions.join(' AND ')

    const countRows = await this.conn.query<{ count: number }>(
      `SELECT COUNT(DISTINCT m.id) as count
       FROM materials m
       WHERE ${whereClause}`,
      params
    )
    const total = normalizeNumber(countRows[0]?.count)

    params.push(limit)
    params.push(offset)

    const rows = await this.conn.query<MaterialRow & { song_count: number; prompt_variants_count: number }>(
      `SELECT m.*, 
         COUNT(DISTINCT mi.id) FILTER (WHERE mi.item_type = 'song') as song_count,
         COUNT(DISTINCT pr.id) FILTER (WHERE pr.target_type = 'material-main' AND pr.slot_type = 'artist-style') as prompt_variants_count
       FROM materials m
       LEFT JOIN material_items mi ON m.id = mi.material_id AND mi.is_deleted = false
       LEFT JOIN prompts pr ON m.id = pr.target_id AND pr.target_type = 'material-main' AND pr.slot_type = 'artist-style' AND pr.is_deleted = false
       WHERE ${whereClause}
       GROUP BY m.id
       ORDER BY m.sort_order, m.created_at
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    )

    return {
      items: rows.map(row => this.rowToEntity(row)),
      total,
    }
  }
}
