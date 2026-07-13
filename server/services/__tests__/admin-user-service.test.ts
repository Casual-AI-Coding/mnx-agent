import { describe, expect, it } from 'vitest'
import type { AdminUserListItem } from '../../repositories/admin-user-repository.js'
import { AdminUserService } from '../admin-user-service.js'

type ListCall = {
  limit: number
  offset: number
}

type AdminUserListRepository = {
  countUsers(): Promise<number>
  listUsers(options: ListCall): Promise<AdminUserListItem[]>
}

function createUser(id: string): AdminUserListItem {
  return {
    id,
    username: 'tester',
    email: 'tester@example.com',
    minimax_api_key: 'minimax_****1234',
    minimax_region: 'cn',
    role: 'user',
    is_active: true,
    last_login_at: null,
    created_at: '2026-07-14T00:00:00.000',
    updated_at: '2026-07-14T00:00:00.000',
  }
}

function createRepository(total: number, users: AdminUserListItem[]): {
  repository: AdminUserListRepository
  listCalls: ListCall[]
} {
  const listCalls: ListCall[] = []

  return {
    repository: {
      async countUsers(): Promise<number> {
        return total
      },
      async listUsers(options: ListCall): Promise<AdminUserListItem[]> {
        listCalls.push(options)
        return users
      },
    },
    listCalls,
  }
}

describe('AdminUserService', () => {
  it('calculates the second-page offset and total pages', async () => {
    const users = [createUser('user-2')]
    const { repository, listCalls } = createRepository(7, users)
    const service = new AdminUserService(repository)

    await expect(service.listUsers({ page: 2, limit: 5 })).resolves.toEqual({
      data: users,
      pagination: { page: 2, limit: 5, total: 7, totalPages: 2 },
    })
    expect(listCalls).toEqual([{ limit: 5, offset: 5 }])
  })

  it('reports zero total pages when no users exist', async () => {
    const { repository, listCalls } = createRepository(0, [])
    const service = new AdminUserService(repository)

    await expect(service.listUsers({ page: 1, limit: 20 })).resolves.toEqual({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    })
    expect(listCalls).toEqual([{ limit: 20, offset: 0 }])
  })
})
