import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('announcements route dependency contract', () => {
  it('routes announcement use cases through AnnouncementService instead of database connection details', async () => {
    const source = await readFile('server/routes/admin/announcements.ts', 'utf8')

    expect(source).toContain('getAnnouncementService')
    expect(source).not.toContain('../../database/connection')
    expect(source).not.toContain('getConnection(')
    expect(source).not.toContain('INSERT INTO announcements')
    expect(source).not.toContain('UPDATE announcements')
    expect(source).not.toContain('new AnnouncementRepository')
  })
})
