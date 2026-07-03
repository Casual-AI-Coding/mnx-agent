import { describe, expect, it, vi, beforeEach } from 'vitest'
import { internalAxios } from '../client'
import { listPrompts } from '../prompts'
import type { PromptRecord } from '../../../types/prompt'

vi.mock('../client', () => ({
  internalAxios: {
    get: vi.fn(),
  },
}))

describe('prompt API client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('按目标和槽位查询提示词候选 when 调用 listPrompts', async () => {
    const prompts: readonly PromptRecord[] = [
      {
        id: 'prompt-1',
        target_type: 'material-main',
        target_id: 'material-1',
        slot_type: 'artist-style',
        name: '风格候选',
        content: 'dream pop',
        sort_order: 1,
        is_default: true,
        owner_id: 'owner-1',
        is_deleted: false,
        created_at: '2026-07-03T00:00:00',
        updated_at: '2026-07-03T00:00:00',
        deleted_at: null,
      },
    ]

    vi.mocked(internalAxios.get).mockResolvedValue({ data: { data: prompts } })

    const result = await listPrompts({
      target_type: 'material-main',
      target_id: 'material-1',
      slot_type: 'artist-style',
    })

    expect(result).toEqual({ success: true, data: prompts })
    expect(internalAxios.get).toHaveBeenCalledWith('/prompts', {
      params: {
        target_type: 'material-main',
        target_id: 'material-1',
        slot_type: 'artist-style',
      },
    })
  })
})
