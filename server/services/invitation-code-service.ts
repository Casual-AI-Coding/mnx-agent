import crypto from 'crypto'

import type {
  GenerateInvitationCodesInput,
  InvitationCode,
  InvitationCodeRepositoryPort,
  InvitationCodeUpdateInput,
  InvitationCodeUpdateResult,
} from './invitation-code-types.js'

export class InvitationCodeService {
  constructor(private readonly repository: InvitationCodeRepositoryPort) {}

  async list(creatorId: string): Promise<InvitationCode[]> {
    return this.repository.listByCreator(creatorId)
  }

  async generateBatch(
    input: GenerateInvitationCodesInput,
    creatorId: string,
  ): Promise<{ count: number; codes: Array<{ code: string; max_uses: number; expires_at?: string | null }> }> {
    const expiresAt = input.expires_at ?? null
    const codes: Array<{ code: string; max_uses: number; expires_at?: string | null }> = []

    for (let index = 0; index < input.count; index += 1) {
      const code = crypto.randomBytes(16).toString('hex').toUpperCase()
      await this.repository.create({
        code,
        creatorId,
        maxUses: input.max_uses,
        expiresAt,
      })
      codes.push({ code, max_uses: input.max_uses, expires_at: input.expires_at })
    }

    return { count: codes.length, codes }
  }

  async update(
    id: string,
    input: InvitationCodeUpdateInput,
    creatorId: string,
  ): Promise<InvitationCodeUpdateResult | null> {
    const existing = await this.repository.findByIdForCreator(id, creatorId)
    if (!existing) {
      return null
    }

    if (
      input.max_uses === undefined
      && input.expires_at === undefined
      && input.is_active === undefined
    ) {
      return { updated: false, code: existing }
    }

    await this.repository.update(id, creatorId, input)
    const updated = await this.repository.findByIdForCreator(id, creatorId)
    if (!updated) {
      return null
    }

    return { updated: true, code: updated }
  }

  async deactivate(id: string, creatorId: string): Promise<boolean> {
    return this.repository.deactivate(id, creatorId)
  }
}
