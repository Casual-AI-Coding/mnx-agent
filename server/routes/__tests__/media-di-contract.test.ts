import { describe, expect, it } from 'vitest'
import { readFile } from 'fs/promises'
import { resolve } from 'path'

describe('media route dependency contract', () => {
  it('resolves external API log repository through service registration', async () => {
    const source = await readFile(resolve(process.cwd(), 'server/routes/media.ts'), 'utf8')

    expect(source).toContain('getExternalApiLogRepository')
    expect(source).not.toContain('new ExternalApiLogRepository')
    expect(source).not.toContain('../repositories/external-api-log.repository')
    expect(source).not.toContain('../database/connection')
  })
})
