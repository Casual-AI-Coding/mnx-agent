import { beforeEach, describe, expect, it } from 'vitest'
import { getDatabase } from '../database/service-async.js'
import { getConnection } from '../database/connection.js'
import { getTestFileMarker, resetTestFileMarker, setupTestDatabase, globalTeardown } from './test-helpers.js'

describe('test-helpers', () => {
  beforeEach(() => {
    resetTestFileMarker()
  })

  it('对同一测试文件 URL 返回稳定 marker', () => {
    const firstMarker = getTestFileMarker('file:///tests/a.test.ts')
    const secondMarker = getTestFileMarker('file:///tests/a.test.ts')

    expect(firstMarker).toBe(secondMarker)
  })

  it('对不同测试文件 URL 返回不同 marker', () => {
    const firstMarker = getTestFileMarker('file:///tests/a.test.ts')
    const secondMarker = getTestFileMarker('file:///tests/b.test.ts')

    expect(firstMarker).not.toBe(secondMarker)
  })

  it('setupTestDatabase 应重置已缓存的 DatabaseService 单例', async () => {
    const staleDb = await getDatabase()
    const staleConnection = staleDb.getConnection()

    await setupTestDatabase()

    const refreshedConnection = getConnection()

    expect(refreshedConnection).not.toBe(staleConnection)

    await globalTeardown()
  })

  it('测试环境下 getDatabase 默认应连接测试库', async () => {
    const db = await getDatabase()
    const rows = await db.getConnection().query<{ current_database: string }>('SELECT current_database() AS current_database')

    expect(rows[0].current_database).toBe('mnx_agent_test')

    await globalTeardown()
  })
})
