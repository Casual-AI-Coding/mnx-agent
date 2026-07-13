import { v4 as uuidv4 } from 'uuid'

import type { DatabaseConnection } from '../database/connection.js'
import { toLocalISODateString } from '../lib/date-utils.js'
import type {
  CreateInvitationCodeInput,
  InvitationCode,
  InvitationCodeRepositoryPort,
  InvitationCodeUpdateInput,
} from '../services/invitation-code-types.js'

export class InvitationCodeRepository implements InvitationCodeRepositoryPort {
  constructor(private readonly connection: DatabaseConnection) {}

  async listByCreator(creatorId: string): Promise<InvitationCode[]> {
    return this.connection.query<InvitationCode>(`
      SELECT ic.*, u.username AS created_by_username
      FROM invitation_codes ic
      LEFT JOIN users u ON ic.created_by = u.id
      WHERE ic.created_by = $1
      ORDER BY ic.created_at DESC
    `, [creatorId])
  }

  async findByIdForCreator(id: string, creatorId: string): Promise<InvitationCode | null> {
    const rows = await this.connection.query<InvitationCode>(
      'SELECT * FROM invitation_codes WHERE id = $1 AND created_by = $2',
      [id, creatorId],
    )

    return rows[0] ?? null
  }

  async create(input: CreateInvitationCodeInput): Promise<void> {
    await this.connection.execute(
      `INSERT INTO invitation_codes (id, code, created_by, max_uses, used_count, expires_at, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        uuidv4(),
        input.code,
        input.creatorId,
        input.maxUses,
        0,
        input.expiresAt,
        true,
        toLocalISODateString(),
      ],
    )
  }

  async update(id: string, creatorId: string, input: InvitationCodeUpdateInput): Promise<void> {
    const fields: string[] = []
    const values: unknown[] = []
    let index = 1

    if (input.max_uses !== undefined) {
      fields.push(`max_uses = $${index}`)
      values.push(input.max_uses)
      index += 1
    }
    if (input.expires_at !== undefined) {
      fields.push(`expires_at = $${index}`)
      values.push(input.expires_at)
      index += 1
    }
    if (input.is_active !== undefined) {
      fields.push(`is_active = $${index}`)
      values.push(input.is_active)
      index += 1
    }

    values.push(id, creatorId)
    await this.connection.execute(
      `UPDATE invitation_codes SET ${fields.join(', ')} WHERE id = $${index} AND created_by = $${index + 1}`,
      values,
    )
  }

  async deactivate(id: string, creatorId: string): Promise<boolean> {
    const result = await this.connection.execute(
      'UPDATE invitation_codes SET is_active = false WHERE id = $1 AND created_by = $2',
      [id, creatorId],
    )

    return result.changes > 0
  }
}
