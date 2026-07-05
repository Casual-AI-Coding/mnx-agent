import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('admin workflows route DI contract', () => {
  it('resolves UserService through service registration instead of constructing it in the route', () => {
    const source = readFileSync('server/routes/admin/workflows.ts', 'utf8')

    expect(source).toContain('getUserService')
    expect(source).not.toContain('new UserService')
    expect(source).not.toContain('../../database/connection')
    expect(source).not.toContain('import { UserService }')
  })
})
