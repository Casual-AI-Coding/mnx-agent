export interface InvitationCode {
  id: string
  code: string
  created_by: string | null
  created_by_username?: string | null
  max_uses: number
  used_count: number
  expires_at: string | null
  is_active: boolean
  created_at: string
}

export interface GenerateInvitationCodesInput {
  count: number
  max_uses: number
  expires_at?: string | null
}

export interface InvitationCodeUpdateInput {
  max_uses?: number
  expires_at?: string | null
  is_active?: boolean
}

export interface CreateInvitationCodeInput {
  code: string
  creatorId: string
  maxUses: number
  expiresAt: string | null
}

export interface InvitationCodeRepositoryPort {
  listByCreator(creatorId: string): Promise<InvitationCode[]>
  findByIdForCreator(id: string, creatorId: string): Promise<InvitationCode | null>
  create(input: CreateInvitationCodeInput): Promise<void>
  update(id: string, creatorId: string, input: InvitationCodeUpdateInput): Promise<void>
  deactivate(id: string, creatorId: string): Promise<boolean>
}

export interface InvitationCodeUpdateResult {
  updated: boolean
  code: InvitationCode
}
