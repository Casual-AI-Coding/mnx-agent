import { v4 as uuidv4 } from 'uuid'
import { DatabaseConnection } from '../database/connection.js'
import type {
  CapacityRecord,
  CapacityRecordRow,
  UpdateCapacityRecord,
} from '../database/types.js'

function toISODate(): string {
  return new Date().toISOString()
}

function rowToCapacityRecord(row: CapacityRecordRow): CapacityRecord {
  return row
}

export class CapacityRepository {
  private conn: DatabaseConnection

  constructor(conn: DatabaseConnection) {
    this.conn = conn
  }

  protected isPostgres(): boolean {
    return this.conn.isPostgres()
  }

  async getAll(): Promise<CapacityRecord[]> {
    const rows = await this.conn.query<CapacityRecordRow>('SELECT * FROM capacity_tracking ORDER BY service_type')
    return rows.map(rowToCapacityRecord)
  }

  async getByService(serviceType: string): Promise<CapacityRecord | null> {
    const rows = await this.conn.query<CapacityRecordRow>(
      'SELECT * FROM capacity_tracking WHERE service_type = $1',
      [serviceType]
    )
    return rows[0] ? rowToCapacityRecord(rows[0]) : null
  }

  async upsert(
    serviceType: string,
    data: UpdateCapacityRecord & { remaining_quota: number; total_quota: number }
  ): Promise<CapacityRecord> {
    const existing = await this.getByService(serviceType)
    const now = toISODate()

    if (existing) {
      await this.conn.execute(
        'UPDATE capacity_tracking SET remaining_quota = $1, total_quota = $2, reset_at = $3, last_checked_at = $4 WHERE service_type = $5',
        [data.remaining_quota, data.total_quota, data.reset_at ?? null, now, serviceType]
      )
      return (await this.getByService(serviceType))!
    }

    const id = uuidv4()
    await this.conn.execute(
      'INSERT INTO capacity_tracking (id, service_type, remaining_quota, total_quota, reset_at, last_checked_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, serviceType, data.remaining_quota, data.total_quota, data.reset_at ?? null, now]
    )
    return (await this.getByService(serviceType))!
  }

  async updateCapacity(serviceType: string, remaining: number): Promise<void> {
    await this.conn.execute(
      'UPDATE capacity_tracking SET remaining_quota = $1, last_checked_at = $2 WHERE service_type = $3',
      [remaining, toISODate(), serviceType]
    )
  }

  async decrementCapacity(serviceType: string, amount: number = 1): Promise<CapacityRecord | null> {
    const existing = await this.getByService(serviceType)
    if (!existing) return null

    const newRemaining = Math.max(0, existing.remaining_quota - amount)
    await this.conn.execute(
      'UPDATE capacity_tracking SET remaining_quota = $1, last_checked_at = $2 WHERE service_type = $3',
      [newRemaining, toISODate(), serviceType]
    )
    return this.getByService(serviceType)
  }
}
