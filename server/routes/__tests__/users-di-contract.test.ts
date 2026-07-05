import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('users route dependency contract', () => {
  it('resolves UserService through the service container', () => {
    const source = readFileSync(resolve(process.cwd(), 'server/routes/users.ts'), 'utf8')

    expect(source).toContain('getUserService')
    expect(source).not.toContain('new UserService')
    expect(source).not.toContain('../services/user-service')
  })
})
