import { v4 as uuidv4 } from 'uuid'
import type { DatabaseConnection } from '../database/connection.js'
import { toLocalISODateString } from '../lib/date-utils.js'
import type {
  Announcement,
  AnnouncementRepositoryPort,
  AnnouncementUpdateInput,
  CreateAnnouncementInput,
} from '../services/announcement-types.js'

export class AnnouncementRepository implements AnnouncementRepositoryPort {
  constructor(private readonly connection: DatabaseConnection) {}

  async findActive(): Promise<Announcement[]> {
    return this.connection.query<Announcement>(`
      SELECT *
      FROM announcements
      WHERE is_deleted = false
        AND status = 'published'
        AND (starts_at IS NULL OR starts_at <= CURRENT_TIMESTAMP)
        AND (ends_at IS NULL OR ends_at >= CURRENT_TIMESTAMP)
      ORDER BY created_at DESC
    `)
  }

  async list(): Promise<Announcement[]> {
    return this.connection.query<Announcement>(`
      SELECT a.*, creator.username AS created_by_username, updater.username AS updated_by_username
      FROM announcements a
      LEFT JOIN users creator ON creator.id = a.created_by
      LEFT JOIN users updater ON updater.id = a.updated_by
      WHERE a.is_deleted = false
      ORDER BY a.created_at DESC
    `)
  }

  async findById(id: string): Promise<Announcement | null> {
    const rows = await this.connection.query<Announcement>(
      'SELECT * FROM announcements WHERE id = $1 AND is_deleted = false',
      [id]
    )

    return rows[0] ?? null
  }

  async create(input: CreateAnnouncementInput, actorId: string): Promise<Announcement | null> {
    const id = uuidv4()
    const now = toLocalISODateString()

    await this.connection.execute(
      `INSERT INTO announcements (
        id, title, content, severity, status, starts_at, ends_at, owner_id, created_by, updated_by, created_at, updated_at, is_deleted
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, $8, $9, $9, false)`,
      [
        id,
        input.title,
        input.content,
        input.severity,
        input.status,
        input.starts_at ?? null,
        input.ends_at ?? null,
        actorId,
        now,
      ]
    )

    return this.findById(id)
  }

  async update(id: string, input: AnnouncementUpdateInput, actorId: string): Promise<void> {
    const fields: string[] = []
    const values: unknown[] = []
    let index = 1

    if (input.title !== undefined) {
      fields.push(`title = $${index}`)
      values.push(input.title)
      index++
    }
    if (input.content !== undefined) {
      fields.push(`content = $${index}`)
      values.push(input.content)
      index++
    }
    if (input.severity !== undefined) {
      fields.push(`severity = $${index}`)
      values.push(input.severity)
      index++
    }
    if (input.status !== undefined) {
      fields.push(`status = $${index}`)
      values.push(input.status)
      index++
    }
    if (input.starts_at !== undefined) {
      fields.push(`starts_at = $${index}`)
      values.push(input.starts_at)
      index++
    }
    if (input.ends_at !== undefined) {
      fields.push(`ends_at = $${index}`)
      values.push(input.ends_at)
      index++
    }

    fields.push(`updated_by = $${index}`)
    values.push(actorId)
    index++
    fields.push(`updated_at = $${index}`)
    values.push(toLocalISODateString())
    index++
    values.push(id)

    await this.connection.execute(
      `UPDATE announcements SET ${fields.join(', ')} WHERE id = $${index} AND is_deleted = false`,
      values
    )
  }

  async softDelete(id: string, actorId: string): Promise<boolean> {
    const result = await this.connection.execute(
      `UPDATE announcements
       SET is_deleted = true, deleted_at = $1, updated_at = $1, updated_by = $2
       WHERE id = $3 AND is_deleted = false`,
      [toLocalISODateString(), actorId, id]
    )

    return result.changes > 0
  }
}
