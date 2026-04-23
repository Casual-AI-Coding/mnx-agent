import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ArtistWorkspace } from '../ArtistWorkspace'
import type { MaterialDetailResult } from '@/types/material'

vi.mock('@/lib/api/materials', () => ({
  getMaterialDetail: vi.fn(),
  updateMaterial: vi.fn(),
  createMaterialItem: vi.fn(),
  updateMaterialItem: vi.fn(),
  deleteMaterialItem: vi.fn(),
  reorderMaterialItems: vi.fn(),
}))

vi.mock('@/lib/api/prompts', () => ({
  createPrompt: vi.fn(),
  updatePrompt: vi.fn(),
  setDefaultPrompt: vi.fn(),
  deletePrompt: vi.fn(),
  reorderPrompts: vi.fn(),
}))

const createMockMaterialDetail = (): MaterialDetailResult => ({
  material: {
    id: 'artist-1',
    material_type: 'artist',
    name: 'Test Artist',
    description: 'Test description',
    metadata: null,
    owner_id: 'user-1',
    sort_order: 0,
    is_deleted: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    deleted_at: null,
  },
  materialPrompts: [
    {
      id: 'prompt-1',
      target_type: 'material-main',
      target_id: 'artist-1',
      slot_type: 'artist-style',
      name: '风格A',
      content: '风格A内容',
      sort_order: 0,
      is_default: true,
      owner_id: 'user-1',
      is_deleted: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      deleted_at: null,
    },
    {
      id: 'prompt-2',
      target_type: 'material-main',
      target_id: 'artist-1',
      slot_type: 'artist-style',
      name: '风格B',
      content: '风格B内容',
      sort_order: 1,
      is_default: false,
      owner_id: 'user-1',
      is_deleted: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      deleted_at: null,
    },
  ],
  items: [
    {
      id: 'song-1',
      material_id: 'artist-1',
      item_type: 'song',
      name: 'Blue Night',
      lyrics: '歌词内容',
      remark: null,
      metadata: null,
      owner_id: 'user-1',
      sort_order: 0,
      is_deleted: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      deleted_at: null,
      prompts: [
        {
          id: 'song-prompt-1',
          target_type: 'material-item',
          target_id: 'song-1',
          slot_type: 'song-style',
          name: '歌曲风格A',
          content: 'Blue Night song style content',
          sort_order: 0,
          is_default: true,
          owner_id: 'user-1',
          is_deleted: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          deleted_at: null,
        },
      ],
    },
    {
      id: 'song-2',
      material_id: 'artist-1',
      item_type: 'song',
      name: 'Red Sunset',
      lyrics: '另一个歌词',
      remark: null,
      metadata: null,
      owner_id: 'user-1',
      sort_order: 1,
      is_deleted: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      deleted_at: null,
      prompts: [
        {
          id: 'song-prompt-2',
          target_type: 'material-item',
          target_id: 'song-2',
          slot_type: 'song-style',
          name: '歌曲风格B',
          content: 'Red Sunset song style content',
          sort_order: 0,
          is_default: true,
          owner_id: 'user-1',
          is_deleted: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          deleted_at: null,
        },
      ],
    },
  ],
})

describe('ArtistWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the 2x2 layout with all four panels', async () => {
    const { getMaterialDetail } = await import('@/lib/api/materials')
    vi.mocked(getMaterialDetail).mockResolvedValue({
      success: true,
      data: createMockMaterialDetail(),
    })

    render(<ArtistWorkspace materialId="artist-1" />)

    expect(await screen.findByText('基本信息')).toBeInTheDocument()
    expect(screen.getByText('音乐人风格 Prompt')).toBeInTheDocument()
    expect(screen.getByText('歌曲库')).toBeInTheDocument()
    expect(screen.getByText('歌曲风格 Prompt')).toBeInTheDocument()
  })

  it('renders artist basic info from detail data', async () => {
    const { getMaterialDetail } = await import('@/lib/api/materials')
    vi.mocked(getMaterialDetail).mockResolvedValue({
      success: true,
      data: createMockMaterialDetail(),
    })

    render(<ArtistWorkspace materialId="artist-1" />)

    expect(await screen.findByDisplayValue('Test Artist')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Test description')).toBeInTheDocument()
  })

  it('renders artist prompt candidates in tabs', async () => {
    const { getMaterialDetail } = await import('@/lib/api/materials')
    vi.mocked(getMaterialDetail).mockResolvedValue({
      success: true,
      data: createMockMaterialDetail(),
    })

    render(<ArtistWorkspace materialId="artist-1" />)

    expect(await screen.findByText('风格A')).toBeInTheDocument()
    expect(screen.getByText('风格B')).toBeInTheDocument()
  })

  it('renders song library with songs', async () => {
    const { getMaterialDetail } = await import('@/lib/api/materials')
    vi.mocked(getMaterialDetail).mockResolvedValue({
      success: true,
      data: createMockMaterialDetail(),
    })

    render(<ArtistWorkspace materialId="artist-1" />)

    expect(await screen.findByText('Blue Night')).toBeInTheDocument()
    expect(screen.getByText('Red Sunset')).toBeInTheDocument()
  })

it('switches song selection and updates the song prompt panel', async () => {
    const { getMaterialDetail } = await import('@/lib/api/materials')
    vi.mocked(getMaterialDetail).mockResolvedValue({
      success: true,
      data: createMockMaterialDetail(),
    })

    const user = userEvent.setup()
    render(<ArtistWorkspace materialId="artist-1" />)

    const redSunsetButton = await screen.findByRole('button', { name: 'Red Sunset' })
    await user.click(redSunsetButton)

    expect(await screen.findByText('歌曲风格B')).toBeInTheDocument()
  })

  it('shows empty state when no songs exist', async () => {
    const { getMaterialDetail } = await import('@/lib/api/materials')
    const emptyDetail = createMockMaterialDetail()
    emptyDetail.items = []
    vi.mocked(getMaterialDetail).mockResolvedValue({
      success: true,
      data: emptyDetail,
    })

    render(<ArtistWorkspace materialId="artist-1" />)

    expect(await screen.findByText(/暂无歌曲/i)).toBeInTheDocument()
  })

  it('handles error state', async () => {
    const { getMaterialDetail } = await import('@/lib/api/materials')
    vi.mocked(getMaterialDetail).mockResolvedValue({
      success: false,
      error: '加载失败',
    })

    render(<ArtistWorkspace materialId="artist-1" />)

    await screen.findByText(/加载失败/i)
  })

  it('allows editing and saving artist basic info', async () => {
    const { getMaterialDetail, updateMaterial } = await import('@/lib/api/materials')
    vi.mocked(getMaterialDetail).mockResolvedValue({
      success: true,
      data: createMockMaterialDetail(),
    })
    vi.mocked(updateMaterial).mockResolvedValue({
      success: true,
      data: {
        ...createMockMaterialDetail().material,
        name: 'Updated Artist Name',
        description: 'Updated description',
      },
    })

    const user = userEvent.setup()
    render(<ArtistWorkspace materialId="artist-1" />)

    const nameInput = await screen.findByDisplayValue('Test Artist')
    const descriptionInput = screen.getByDisplayValue('Test description')
    await user.clear(nameInput)
    await user.type(nameInput, 'Updated Artist Name')
    await user.clear(descriptionInput)
    await user.type(descriptionInput, 'Updated description')

    const saveButtons = screen.getAllByRole('button', { name: '保存' })
    const saveButton = saveButtons[0]
    await user.click(saveButton)

    expect(updateMaterial).toHaveBeenCalledWith('artist-1', {
      name: 'Updated Artist Name',
      description: 'Updated description',
    })
  })

  it('can reorder songs in the song library', async () => {
    const { getMaterialDetail, reorderMaterialItems } = await import('@/lib/api/materials')
    vi.mocked(getMaterialDetail).mockResolvedValue({
      success: true,
      data: createMockMaterialDetail(),
    })
    vi.mocked(reorderMaterialItems).mockResolvedValue({
      success: true,
      data: { reordered: true },
    })

    const user = userEvent.setup()
    render(<ArtistWorkspace materialId="artist-1" />)

    await screen.findByText('Blue Night')
    const moveDownButton = screen.getByRole('button', { name: '向下移动 Blue Night' })
    await user.click(moveDownButton)

    expect(reorderMaterialItems).toHaveBeenCalledWith('artist-1', [
      { id: 'song-2', sort_order: 0 },
      { id: 'song-1', sort_order: 1 },
    ])
  })

  it('can reorder artist-level prompts', async () => {
    const { getMaterialDetail } = await import('@/lib/api/materials')
    const { reorderPrompts } = await import('@/lib/api/prompts')
    vi.mocked(getMaterialDetail).mockResolvedValue({
      success: true,
      data: createMockMaterialDetail(),
    })
    vi.mocked(reorderPrompts).mockResolvedValue({
      success: true,
      data: { reordered: true },
    })

    const user = userEvent.setup()
    render(<ArtistWorkspace materialId="artist-1" />)

    await screen.findByText('风格A')
    const moveDownButton = screen.getByRole('button', { name: '向下移动 风格A' })
    await user.click(moveDownButton)

    expect(reorderPrompts).toHaveBeenCalledWith({
      target_type: 'material-main',
      target_id: 'artist-1',
      slot_type: 'artist-style',
      items: [
        { id: 'prompt-2', sort_order: 0 },
        { id: 'prompt-1', sort_order: 1 },
      ],
    })
  })

  it('can reorder song-level prompts', async () => {
    const { getMaterialDetail } = await import('@/lib/api/materials')
    const { reorderPrompts } = await import('@/lib/api/prompts')
    const detailWithSongPromptCandidates = createMockMaterialDetail()
    detailWithSongPromptCandidates.items[1].prompts = [
      {
        id: 'song-prompt-2',
        target_type: 'material-item',
        target_id: 'song-2',
        slot_type: 'song-style',
        name: '歌曲风格B',
        content: 'Red Sunset song style content',
        sort_order: 0,
        is_default: true,
        owner_id: 'user-1',
        is_deleted: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        deleted_at: null,
      },
      {
        id: 'song-prompt-3',
        target_type: 'material-item',
        target_id: 'song-2',
        slot_type: 'song-style',
        name: '歌曲风格C',
        content: 'Another style',
        sort_order: 1,
        is_default: false,
        owner_id: 'user-1',
        is_deleted: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        deleted_at: null,
      },
    ]
    vi.mocked(getMaterialDetail).mockResolvedValue({
      success: true,
      data: detailWithSongPromptCandidates,
    })
    vi.mocked(reorderPrompts).mockResolvedValue({
      success: true,
      data: { reordered: true },
    })

    const user = userEvent.setup()
    render(<ArtistWorkspace materialId="artist-1" />)

    await screen.findByRole('button', { name: 'Red Sunset' })
    await user.click(screen.getByRole('button', { name: 'Red Sunset' }))

    await screen.findByText('歌曲风格B')
    const moveDownButton = screen.getByRole('button', { name: '向下移动 歌曲风格B' })
    await user.click(moveDownButton)

    expect(reorderPrompts).toHaveBeenCalledWith({
      target_type: 'material-item',
      target_id: 'song-2',
      slot_type: 'song-style',
      items: [
        { id: 'song-prompt-3', sort_order: 0 },
        { id: 'song-prompt-2', sort_order: 1 },
      ],
    })
  })
})
