import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('Settings route DI contract', () => {
  it('resolves SettingsService through service registration instead of constructing it in the route', async () => {
    const source = await readFile('server/routes/settings/index.ts', 'utf8')

    expect(source).toContain('getSettingsService')
    expect(source).not.toContain('new SettingsService')
    expect(source).not.toContain('getConnection()')
  })
})
