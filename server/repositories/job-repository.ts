import { v4 as uuidv4 } from 'uuid'
import { DatabaseConnection } from '../database/connection.js'
import { MisfirePolicy } from '../database/types.js'
import type {
  CronJob,
  CronJobRow,
  CreateCronJob,
  UpdateCronJob,
  RunStats,
} from '../database/types.js'
import { BaseRepository } from './base-repository.js'

function toISODate(): string {
  return new Date().toISOString()
}

function rowToCronJob(row: CronJobRow): CronJob {
  return {
    ...row,
    is_active: typeof row.is_active === 'boolean' ? row.is_active : row.is_active === 1,
    timeout_ms: row.timeout_ms ?? 300000,
    misfire_policy: (row.misfire_policy as MisfirePolicy) ?? MisfirePolicy.FIRE_ONCE,
  }
}

export class JobRepository extends BaseRepository<CronJob, CreateCronJob, UpdateCronJob> {
  protected readonly tableName = 'cron_jobs'

  constructor(conn: DatabaseConnection) {
    super({ conn })
  }

  protected getIdColumn(): string {
    return 'id'
  }

  protected rowToEntity(row: unknown): CronJob {
    return rowToCronJob(row as CronJobRow)
  }

  async getAll(ownerId?: string): Promise<CronJob[]> {
    if (ownerId) {
      const rows = await this.conn.query<CronJobRow>(
        'SELECT * FROM cron_jobs WHERE owner_id = $1 ORDER BY created_at DESC',
        [ownerId]
      )
      return rows.map(rowToCronJob)
    }
    const rows = await this.conn.query<CronJobRow>('SELECT * FROM cron_jobs ORDER BY created_at DESC')
    return rows.map(rowToCronJob)
  }

  async getActive(ownerId?: string): Promise<CronJob[]> {
    if (ownerId) {
      if (this.isPostgres()) {
        const rows = await this.conn.query<CronJobRow>(
          'SELECT * FROM cron_jobs WHERE is_active = true AND owner_id = $1 ORDER BY created_at DESC',
          [ownerId]
        )
        return rows.map(rowToCronJob)
      } else {
        const rows = await this.conn.query<CronJobRow>(
          'SELECT * FROM cron_jobs WHERE is_active = 1 AND owner_id = ? ORDER BY created_at DESC',
          [ownerId]
        )
        return rows.map(rowToCronJob)
      }
    }
    if (this.isPostgres()) {
      const rows = await this.conn.query<CronJobRow>(
        'SELECT * FROM cron_jobs WHERE is_active = true ORDER BY created_at DESC'
      )
      return rows.map(rowToCronJob)
    } else {
      const rows = await this.conn.query<CronJobRow>(
        'SELECT * FROM cron_jobs WHERE is_active = 1 ORDER BY created_at DESC'
      )
      return rows.map(rowToCronJob)
    }
  }

  async create(job: CreateCronJob, ownerId?: string): Promise<CronJob> {
    const id = uuidv4()
    const now = toISODate()
    const isActive = job.is_active !== false
    const timeoutMs = job.timeout_ms ?? 300000
    const timezone = job.timezone ?? 'UTC'
    const misfirePolicy = job.misfire_policy ?? MisfirePolicy.FIRE_ONCE

    if (this.isPostgres()) {
      await this.conn.execute(
        `INSERT INTO cron_jobs (id, name, description, cron_expression, is_active, workflow_id, timezone, created_at, updated_at, timeout_ms, owner_id, misfire_policy)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [id, job.name, job.description ?? null, job.cron_expression, isActive, job.workflow_id ?? null, timezone, now, now, timeoutMs, ownerId ?? null, misfirePolicy]
      )
    } else {
      await this.conn.execute(
        `INSERT INTO cron_jobs (id, name, description, cron_expression, is_active, workflow_id, timezone, created_at, updated_at, timeout_ms, owner_id, misfire_policy)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, job.name, job.description ?? null, job.cron_expression, isActive ? 1 : 0, job.workflow_id ?? null, timezone, now, now, timeoutMs, ownerId ?? null, misfirePolicy]
      )
    }
    return (await this.getById(id))!
  }

  async update(id: string, updates: UpdateCronJob, ownerId?: string): Promise<CronJob | null> {
    const existing = await this.getById(id, ownerId)
    if (!existing) return null

    const fields: string[] = []
    const values: (string | number | boolean | null)[] = []
    let paramIndex = 1

    if (updates.name !== undefined) {
      fields.push(`name = $${paramIndex}`)
      values.push(updates.name)
      paramIndex++
    }
    if (updates.description !== undefined) {
      fields.push(`description = $${paramIndex}`)
      values.push(updates.description)
      paramIndex++
    }
    if (updates.cron_expression !== undefined) {
      fields.push(`cron_expression = $${paramIndex}`)
      values.push(updates.cron_expression)
      paramIndex++
    }
    if (updates.is_active !== undefined) {
      fields.push(`is_active = $${paramIndex}`)
      values.push(this.isPostgres() ? updates.is_active : updates.is_active ? 1 : 0)
      paramIndex++
    }
    if (updates.workflow_id !== undefined) {
      fields.push(`workflow_id = $${paramIndex}`)
      values.push(updates.workflow_id)
      paramIndex++
    }
    if (updates.timezone !== undefined) {
      fields.push(`timezone = $${paramIndex}`)
      values.push(updates.timezone)
      paramIndex++
    }
    if (updates.last_run_at !== undefined) {
      fields.push(`last_run_at = $${paramIndex}`)
      values.push(updates.last_run_at)
      paramIndex++
    }
    if (updates.next_run_at !== undefined) {
      fields.push(`next_run_at = $${paramIndex}`)
      values.push(updates.next_run_at)
      paramIndex++
    }
    if (updates.total_runs !== undefined) {
      fields.push(`total_runs = $${paramIndex}`)
      values.push(updates.total_runs)
      paramIndex++
    }
    if (updates.total_failures !== undefined) {
      fields.push(`total_failures = $${paramIndex}`)
      values.push(updates.total_failures)
      paramIndex++
    }
    if (updates.timeout_ms !== undefined) {
      fields.push(`timeout_ms = $${paramIndex}`)
      values.push(updates.timeout_ms)
      paramIndex++
    }
    if (updates.misfire_policy !== undefined) {
      fields.push(`misfire_policy = $${paramIndex}`)
      values.push(updates.misfire_policy)
      paramIndex++
    }

    if (fields.length === 0) return existing

    fields.push(`updated_at = $${paramIndex}`)
    values.push(toISODate())
    paramIndex++
    values.push(id)

    await this.conn.execute(
      `UPDATE cron_jobs SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
      values
    )
    return this.getById(id)
  }

  async toggleActive(id: string, ownerId?: string): Promise<CronJob | null> {
    const existing = await this.getById(id, ownerId)
    if (!existing) return null

    const newIsActive = !existing.is_active
    const now = toISODate()

    if (this.isPostgres()) {
      await this.conn.execute(
        'UPDATE cron_jobs SET is_active = $1, updated_at = $2 WHERE id = $3',
        [newIsActive, now, id]
      )
    } else {
      await this.conn.execute(
        'UPDATE cron_jobs SET is_active = ?, updated_at = ? WHERE id = ?',
        [newIsActive ? 1 : 0, now, id]
      )
    }
    return this.getById(id)
  }

  async updateRunStats(id: string, stats: RunStats, ownerId?: string): Promise<CronJob | null> {
    const existing = await this.getById(id, ownerId)
    if (!existing) return null

    const newTotalRuns = existing.total_runs + 1
    const newTotalFailures = stats.success ? existing.total_failures : existing.total_failures + 1
    const now = toISODate()

    let result: { changes: number }
    if (ownerId) {
      result = await this.conn.execute(
        'UPDATE cron_jobs SET total_runs = $1, total_failures = $2, last_run_at = $3, updated_at = $4 WHERE id = $5 AND owner_id = $6',
        [newTotalRuns, newTotalFailures, now, now, id, ownerId]
      )
      if (result.changes === 0) {
        // This shouldn't happen if getById succeeded, but indicates potential IDOR attempt
        console.warn(`Security: updateRunStats authorization failed for job ${id}, owner ${ownerId}`)
        return null
      }
    } else {
      result = await this.conn.execute(
        'UPDATE cron_jobs SET total_runs = $1, total_failures = $2, last_run_at = $3, updated_at = $4 WHERE id = $5',
        [newTotalRuns, newTotalFailures, now, now, id]
      )
      if (result.changes === 0) {
        return null
      }
    }
    return this.getById(id, ownerId)

  }

  async updateLastRun(id: string, nextRun: string, ownerId?: string): Promise<CronJob | null> {
    const now = toISODate()
    if (ownerId) {
      await this.conn.execute(
        'UPDATE cron_jobs SET last_run_at = $1, next_run_at = $2, updated_at = $3 WHERE id = $4 AND owner_id = $5',
        [now, nextRun, now, id, ownerId]
      )
    } else {
      await this.conn.execute(
        'UPDATE cron_jobs SET last_run_at = $1, next_run_at = $2, updated_at = $3 WHERE id = $4',
        [now, nextRun, now, id]
      )
    }
    return this.getById(id, ownerId)
  }

  async addTag(jobId: string, tag: string): Promise<void> {
    const id = uuidv4()
    const now = toISODate()
    await this.conn.execute(
      `INSERT INTO job_tags (id, job_id, tag, created_at) VALUES ($1, $2, $3, $4)`,
      [id, jobId, tag, now]
    )
  }

  async removeTag(jobId: string, tag: string): Promise<void> {
    await this.conn.execute(
      `DELETE FROM job_tags WHERE job_id = $1 AND tag = $2`,
      [jobId, tag]
    )
  }

  async getTags(jobId: string): Promise<string[]> {
    const rows = await this.conn.query<{ tag: string }>(
      `SELECT tag FROM job_tags WHERE job_id = $1 ORDER BY tag`,
      [jobId]
    )
    return rows.map(r => r.tag)
  }

  async getByTag(tag: string, ownerId?: string): Promise<CronJob[]> {
    let sql: string
    let params: string[]

    if (ownerId) {
      sql = `
        SELECT c.* FROM cron_jobs c
        INNER JOIN job_tags jt ON c.id = jt.job_id
        WHERE jt.tag = $1 AND c.owner_id = $2
        ORDER BY c.created_at DESC
      `
      params = [tag, ownerId]
    } else {
      sql = `
        SELECT c.* FROM cron_jobs c
        INNER JOIN job_tags jt ON c.id = jt.job_id
        WHERE jt.tag = $1
        ORDER BY c.created_at DESC
      `
      params = [tag]
    }

    const rows = await this.conn.query<CronJobRow>(sql, params)
    return rows.map(rowToCronJob)
  }

  async getAllTags(): Promise<{ tag: string; count: number }[]> {
    const rows = await this.conn.query<{ tag: string; count: string }>(
      `SELECT tag, COUNT(*) as count FROM job_tags GROUP BY tag ORDER BY tag`
    )
    return rows.map(r => ({ tag: r.tag, count: parseInt(r.count, 10) }))
  }

  async addDependency(jobId: string, dependsOnJobId: string): Promise<void> {
    const id = uuidv4()
    const now = toISODate()
    await this.conn.execute(
      `INSERT INTO job_dependencies (id, job_id, depends_on_job_id, created_at) VALUES ($1, $2, $3, $4)`,
      [id, jobId, dependsOnJobId, now]
    )
  }

  async removeDependency(jobId: string, dependsOnJobId: string): Promise<void> {
    await this.conn.execute(
      `DELETE FROM job_dependencies WHERE job_id = $1 AND depends_on_job_id = $2`,
      [jobId, dependsOnJobId]
    )
  }

  async getDependencies(jobId: string): Promise<string[]> {
    const rows = await this.conn.query<{ depends_on_job_id: string }>(
      `SELECT depends_on_job_id FROM job_dependencies WHERE job_id = $1 ORDER BY created_at`,
      [jobId]
    )
    return rows.map(r => r.depends_on_job_id)
  }

  async getDependents(jobId: string): Promise<string[]> {
    const rows = await this.conn.query<{ job_id: string }>(
      `SELECT job_id FROM job_dependencies WHERE depends_on_job_id = $1 ORDER BY created_at`,
      [jobId]
    )
    return rows.map(r => r.job_id)
  }

  async hasCircularDependency(jobId: string, dependsOnJobId: string): Promise<boolean> {
    const visited = new Set<string>()
    const queue = [dependsOnJobId]

    while (queue.length > 0) {
      const current = queue.shift()!
      if (current === jobId) {
        return true
      }
      if (visited.has(current)) {
        continue
      }
      visited.add(current)

      const dependencies = await this.getDependencies(current)
      queue.push(...dependencies)
    }

    return false
  }
}
