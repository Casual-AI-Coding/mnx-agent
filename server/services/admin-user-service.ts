import type {
  AdminUserListItem,
  AdminUserListOptions,
  AdminUserUpdate,
} from '../repositories/admin-user-repository.js'

export interface AdminUserRepositoryPort {
  countUsers(): Promise<number>
  listUsers(options: AdminUserListOptions): Promise<AdminUserListItem[]>
  updateUser(id: string, updates: AdminUserUpdate): Promise<AdminUserListItem | null>
}

export type AdminUserListRequest = {
  readonly page: number
  readonly limit: number
}

export type AdminUserListResult = {
  readonly data: AdminUserListItem[]
  readonly pagination: {
    readonly page: number
    readonly limit: number
    readonly total: number
    readonly totalPages: number
  }
}

export class AdminUserService {
  constructor(private readonly repository: AdminUserRepositoryPort) {}

  async listUsers({ page, limit }: AdminUserListRequest): Promise<AdminUserListResult> {
    const [total, data] = await Promise.all([
      this.repository.countUsers(),
      this.repository.listUsers({ limit, offset: (page - 1) * limit }),
    ])

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async updateUser(id: string, updates: AdminUserUpdate): Promise<AdminUserListItem | null> {
    return this.repository.updateUser(id, updates)
  }
}
