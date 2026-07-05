import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

describe('auth route DI contract', () => {
  it('uses the container registered user service', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url))
    const routePath = resolve(currentDir, '../auth.ts')
    const source = readFileSync(routePath, 'utf8')

    expect(source).toContain('getUserService')
    expect(source).not.toContain('new UserService')
    expect(source).not.toContain('../database/connection')
  })
})
