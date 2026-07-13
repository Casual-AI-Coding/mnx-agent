import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function readSource(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

describe('invitation code route dependency contract', () => {
  it('uses the registered management service instead of a database connection', () => {
    const source = readSource('server/routes/invitation-codes.ts')

    expect(source).toContain('getInvitationCodeService')
    expect(source).not.toContain('../database/connection')
    expect(source).not.toContain('getConnection(')
    expect(source).not.toContain('INSERT INTO invitation_codes')
    expect(source).not.toContain('UPDATE invitation_codes')
    expect(source).not.toContain('new InvitationCodeRepository')
  })
})
