import { describe, expect, it } from 'vitest'
import { InvitationCodeService } from '../invitation-code-service.js'
import type {
  CreateInvitationCodeInput,
  InvitationCode,
  InvitationCodeRepositoryPort,
} from '../invitation-code-types.js'

function createInvitationCode(id: string, overrides: Partial<InvitationCode> = {}): InvitationCode {
  return {
    id,
    code: `CODE-${id}`,
    created_by: 'owner-1',
    created_by_username: '管理员',
    max_uses: 1,
    used_count: 0,
    expires_at: null,
    is_active: true,
    created_at: '2026-07-14 12:00:00',
    ...overrides,
  }
}

function createRepository(options: {
  list?: InvitationCode[]
  findResults?: Array<InvitationCode | null>
  deactivateResult?: boolean
} = {}): {
  repository: InvitationCodeRepositoryPort
  calls: string[]
  createdCodes: string[]
  createdInputs: CreateInvitationCodeInput[]
} {
  const calls: string[] = []
  const createdCodes: string[] = []
  const createdInputs: CreateInvitationCodeInput[] = []
  const findResults = [...(options.findResults ?? [])]

  return {
    calls,
    createdCodes,
    createdInputs,
    repository: {
      listByCreator: async creatorId => {
        calls.push(`list:${creatorId}`)
        return options.list ?? []
      },
      findByIdForCreator: async (id, creatorId) => {
        calls.push(`find:${id}:${creatorId}`)
        return findResults.shift() ?? null
      },
      create: async input => {
        calls.push(`create:${input.creatorId}`)
        createdCodes.push(input.code)
        createdInputs.push(input)
      },
      update: async (id, creatorId) => {
        calls.push(`update:${id}:${creatorId}`)
      },
      deactivate: async (id, creatorId) => {
        calls.push(`deactivate:${id}:${creatorId}`)
        return options.deactivateResult ?? true
      },
    },
  }
}

describe('InvitationCodeService', () => {
  it('lists codes created by the requesting administrator', async () => {
    const codes = [createInvitationCode('code-1')]
    const { repository, calls } = createRepository({ list: codes })

    await expect(new InvitationCodeService(repository).list('owner-1')).resolves.toEqual(codes)
    expect(calls).toEqual(['list:owner-1'])
  })

  it('creates one persistent uppercase hexadecimal code for every requested batch item', async () => {
    const { repository, calls, createdCodes } = createRepository()

    const result = await new InvitationCodeService(repository).generateBatch(
      { count: 2, max_uses: 3, expires_at: '2026-08-01T00:00:00.000Z' },
      'owner-1',
    )

    expect(result).toMatchObject({ count: 2 })
    expect(result.codes).toHaveLength(2)
    expect(result.codes.map(code => code.max_uses)).toEqual([3, 3])
    expect(result.codes.map(code => code.expires_at)).toEqual([
      '2026-08-01T00:00:00.000Z',
      '2026-08-01T00:00:00.000Z',
    ])
    expect(createdCodes).toHaveLength(2)
    expect(createdCodes[0]).toMatch(/^[0-9A-F]{32}$/)
    expect(createdCodes[1]).toMatch(/^[0-9A-F]{32}$/)
    expect(calls).toEqual(['create:owner-1', 'create:owner-1'])
  })

  it('preserves an omitted expiry field in the batch response while persisting null', async () => {
    const { repository, createdInputs } = createRepository()

    const result = await new InvitationCodeService(repository).generateBatch(
      { count: 1, max_uses: 1 },
      'owner-1',
    )

    expect(result.codes[0]?.expires_at).toBeUndefined()
    expect(createdInputs[0]?.expiresAt).toBeNull()
  })

  it('returns null without mutating when the administrator does not own the code', async () => {
    const { repository, calls } = createRepository({ findResults: [null] })

    await expect(
      new InvitationCodeService(repository).update('code-1', { max_uses: 2 }, 'owner-1'),
    ).resolves.toBeNull()
    expect(calls).toEqual(['find:code-1:owner-1'])
  })

  it('returns the existing code without writing when the update input has no fields', async () => {
    const existing = createInvitationCode('code-1')
    const { repository, calls } = createRepository({ findResults: [existing] })

    await expect(
      new InvitationCodeService(repository).update('code-1', {}, 'owner-1'),
    ).resolves.toEqual({ updated: false, code: existing })
    expect(calls).toEqual(['find:code-1:owner-1'])
  })

  it('refreshes an owned code after persisting an update', async () => {
    const existing = createInvitationCode('code-1')
    const refreshed = createInvitationCode('code-1', { max_uses: 5 })
    const { repository, calls } = createRepository({ findResults: [existing, refreshed] })

    await expect(
      new InvitationCodeService(repository).update('code-1', { max_uses: 5 }, 'owner-1'),
    ).resolves.toEqual({ updated: true, code: refreshed })
    expect(calls).toEqual([
      'find:code-1:owner-1',
      'update:code-1:owner-1',
      'find:code-1:owner-1',
    ])
  })

  it('returns the repository result when deactivating an owned code', async () => {
    const { repository, calls } = createRepository({ deactivateResult: false })

    await expect(new InvitationCodeService(repository).deactivate('code-1', 'owner-1')).resolves.toBe(false)
    expect(calls).toEqual(['deactivate:code-1:owner-1'])
  })
})
