import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('stats and audit route log service contract', () => {
  it('routes log and audit reads through LogService instead of DatabaseService', async () => {
    const statsSource = await readFile('server/routes/stats.ts', 'utf8')
    const auditSource = await readFile('server/routes/audit.ts', 'utf8')

    expect(statsSource).toContain('getLogService')
    expect(statsSource).not.toContain('getDatabaseService')
    expect(statsSource).toContain('getDatabasePoolStatsService')
    expect(statsSource).not.toContain('../database/connection')
    expect(statsSource).not.toContain('PostgresConnection')
    expect(statsSource).not.toContain('getConnection(')

    expect(auditSource).toContain('getLogService')
    expect(auditSource).not.toContain('getDatabaseService')
  })
})
