import { render, screen, within } from '@testing-library/react'
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

  it('shows the default artist prompt content on initial render', async () => {
    const { getMaterialDetail } = await import('@/lib/api/materials')
    vi.mocked(getMaterialDetail).mockResolvedValue({
      success: true,
      data: createMockMaterialDetail(),
    })

    render(<ArtistWorkspace materialId="artist-1" />)

    expect(await screen.findByDisplayValue('风格A内容')).toBeInTheDocument()
  })

  it('renders song library with songs', async () => {
    const { getMaterialDetail } = await import('@/lib/api/materials')
    vi.mocked(getMaterialDetail).mockResolvedValue({
      success: true,
      data: createMockMaterialDetail(),
    })

    render(<ArtistWorkspace materialId="artist-1" />)

    expect(
      await screen.findByRole('button', { name: /^Blue Night当前正在编辑这首歌的风格工作区$/ })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /^Red Sunset点击切换到这首歌的风格候选与歌词上下文$/ })
    ).toBeInTheDocument()
  })

it('switches song selection and updates the song prompt panel', async () => {
    const { getMaterialDetail } = await import('@/lib/api/materials')
    vi.mocked(getMaterialDetail).mockResolvedValue({
      success: true,
      data: createMockMaterialDetail(),
    })

    const user = userEvent.setup()
    render(<ArtistWorkspace materialId="artist-1" />)

    const redSunsetButton = await screen.findByRole('button', {
      name: /^Red Sunset点击切换到这首歌的风格候选与歌词上下文$/,
    })
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

  it('shows an explicit empty selection state when no song is selected', async () => {
    const { getMaterialDetail } = await import('@/lib/api/materials')
    const detail = createMockMaterialDetail()
    detail.items = []
    vi.mocked(getMaterialDetail).mockResolvedValue({
      success: true,
      data: detail,
    })

    render(<ArtistWorkspace materialId="artist-1" />)

    expect(await screen.findByText('未选择歌曲')).toBeInTheDocument()
    expect(screen.getByText('请先在歌曲库中选择或创建一首歌曲')).toBeInTheDocument()
  })

  it('loads detail only once on initial render', async () => {
    const { getMaterialDetail } = await import('@/lib/api/materials')
    vi.mocked(getMaterialDetail).mockResolvedValue({
      success: true,
      data: createMockMaterialDetail(),
    })

    render(<ArtistWorkspace materialId="artist-1" />)

    await screen.findByText('基本信息')

    expect(getMaterialDetail).toHaveBeenCalledTimes(1)
  })

  it('uses initial detail without refetching and updates basic info locally after save', async () => {
    const { getMaterialDetail, updateMaterial } = await import('@/lib/api/materials')
    const detail = createMockMaterialDetail()

    vi.mocked(updateMaterial).mockResolvedValue({
      success: true,
      data: {
        ...detail.material,
        name: 'Updated Artist Name',
        description: 'Updated description',
      },
    })

    const user = userEvent.setup()
    render(<ArtistWorkspace materialId="artist-1" initialDetail={detail} />)

    expect(getMaterialDetail).not.toHaveBeenCalled()

    const nameInput = screen.getByDisplayValue('Test Artist')
    const descriptionInput = screen.getByDisplayValue('Test description')

    await user.clear(nameInput)
    await user.type(nameInput, 'Updated Artist Name')
    await user.clear(descriptionInput)
    await user.type(descriptionInput, 'Updated description')

    await user.click(screen.getAllByRole('button', { name: '保存' })[0])

    expect(updateMaterial).toHaveBeenCalledWith('artist-1', {
      name: 'Updated Artist Name',
      description: 'Updated description',
    })
    expect(getMaterialDetail).not.toHaveBeenCalled()
    expect(await screen.findByDisplayValue('Updated Artist Name')).toBeInTheDocument()
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

    await screen.findByRole('button', {
      name: /^Blue Night当前正在编辑这首歌的风格工作区$/,
    })
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

  it('opens the create artist prompt dialog when clicking the new prompt button', async () => {
    const detail = createMockMaterialDetail()
    const user = userEvent.setup()

    render(<ArtistWorkspace materialId="artist-1" initialDetail={detail} />)

    const promptCard = screen.getByText('音乐人风格 Prompt').closest('[class*="rounded"]')
    expect(promptCard).not.toBeNull()

    await user.click(within(promptCard as HTMLElement).getByRole('button', { name: /新建提示词/ }))

    const dialogTitle = await screen.findByRole('heading', { name: '新建提示词' })
    const dialog = dialogTitle.closest('div[class*="fixed"]')?.parentElement
    expect(dialog).not.toBeNull()
    expect(within(dialog as HTMLElement).getByPlaceholderText('例如：流行风格')).toBeInTheDocument()
  })

  it('opens the create artist prompt dialog from the empty artist prompt state', async () => {
    const { getMaterialDetail } = await import('@/lib/api/materials')
    const detail = createMockMaterialDetail()
    detail.materialPrompts = []
    vi.mocked(getMaterialDetail).mockResolvedValue({
      success: true,
      data: detail,
    })

    const user = userEvent.setup()
    render(<ArtistWorkspace materialId="artist-1" />)

    const artistPromptPanelTitle = await screen.findByText('音乐人风格 Prompt')
    const artistPromptPanel = artistPromptPanelTitle.closest('[class*="rounded"]')
    expect(artistPromptPanel).not.toBeNull()

    await user.click(within(artistPromptPanel as HTMLElement).getByRole('button', { name: /新建提示词/ }))

    expect(screen.getByRole('heading', { name: '新建提示词' })).toBeInTheDocument()
    expect(screen.getByText('创建一个新的音乐人风格提示词候选')).toBeInTheDocument()
  })

  it('creates artist-level prompts locally without refetching detail', async () => {
    const { getMaterialDetail } = await import('@/lib/api/materials')
    const { createPrompt } = await import('@/lib/api/prompts')
    const detail = createMockMaterialDetail()

    vi.mocked(createPrompt).mockResolvedValue({
      success: true,
      data: {
        id: 'prompt-3',
        target_type: 'material-main',
        target_id: 'artist-1',
        slot_type: 'artist-style',
        name: '风格C',
        content: '风格C内容',
        sort_order: 2,
        is_default: false,
        owner_id: 'user-1',
        is_deleted: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        deleted_at: null,
      },
    })

    const user = userEvent.setup()
    render(<ArtistWorkspace materialId="artist-1" initialDetail={detail} />)

    const promptCard = screen.getByText('音乐人风格 Prompt').closest('[class*="rounded"]')
    expect(promptCard).not.toBeNull()

    await user.click(within(promptCard as HTMLElement).getByRole('button', { name: /新建提示词/ }))
    const dialogTitle = await screen.findByRole('heading', { name: '新建提示词' })
    const dialog = dialogTitle.closest('div[class*="fixed"]')?.parentElement
    expect(dialog).not.toBeNull()

    await user.type(within(dialog as HTMLElement).getByPlaceholderText('例如：流行风格'), '风格C')
    const promptContentFields = within(dialog as HTMLElement).getAllByPlaceholderText('输入提示词内容...')
    await user.type(promptContentFields[promptContentFields.length - 1], '风格C内容')
    await user.click(within(dialog as HTMLElement).getByRole('button', { name: '创建提示词' }))

    expect(createPrompt).toHaveBeenCalledWith({
      target_type: 'material-main',
      target_id: 'artist-1',
      slot_type: 'artist-style',
      name: '风格C',
      content: '风格C内容',
      is_default: false,
    })
    expect(getMaterialDetail).not.toHaveBeenCalled()
    expect(await screen.findByText('风格C')).toBeInTheDocument()
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

    await screen.findByRole('button', { name: /^Red Sunset点击切换到这首歌的风格候选与歌词上下文$/ })
    await user.click(screen.getByRole('button', { name: /^Red Sunset点击切换到这首歌的风格候选与歌词上下文$/ }))

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

  it('creates songs locally without refetching detail', async () => {
    const { getMaterialDetail, createMaterialItem } = await import('@/lib/api/materials')
    const detail = createMockMaterialDetail()

    vi.mocked(createMaterialItem).mockResolvedValue({
      success: true,
      data: {
        id: 'song-3',
        material_id: 'artist-1',
        item_type: 'song',
        name: 'Golden Hour',
        lyrics: '新歌词',
        remark: null,
        metadata: null,
        owner_id: 'user-1',
        sort_order: 2,
        is_deleted: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        deleted_at: null,
      },
    })

    const user = userEvent.setup()
    render(<ArtistWorkspace materialId="artist-1" initialDetail={detail} />)

    const songCard = screen.getByText('歌曲库').closest('[class*="rounded"]')
    expect(songCard).not.toBeNull()

    await user.click(within(songCard as HTMLElement).getByRole('button', { name: /新建歌曲/ }))
    const dialogTitle = await screen.findByRole('heading', { name: '新建歌曲' })
    const dialog = dialogTitle.closest('div[class*="fixed"]')?.parentElement
    expect(dialog).not.toBeNull()

    await user.type(within(dialog as HTMLElement).getByPlaceholderText('例如：夜空中最亮的星'), 'Golden Hour')
    await user.type(within(dialog as HTMLElement).getByPlaceholderText('粘贴歌词内容...'), '新歌词')
    await user.click(within(dialog as HTMLElement).getByRole('button', { name: '创建歌曲' }))

    expect(createMaterialItem).toHaveBeenCalledWith('artist-1', {
      material_id: 'artist-1',
      item_type: 'song',
      name: 'Golden Hour',
      lyrics: '新歌词',
    })
    expect(getMaterialDetail).not.toHaveBeenCalled()
    expect(await screen.findByText('当前选中歌曲：')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Golden Hour当前正在编辑这首歌的风格工作区$/ })).toBeInTheDocument()
  })

  it('opens the create song dialog when clicking the new song button', async () => {
    const detail = createMockMaterialDetail()
    const user = userEvent.setup()

    render(<ArtistWorkspace materialId="artist-1" initialDetail={detail} />)

    const songCard = screen.getByText('歌曲库').closest('[class*="rounded"]')
    expect(songCard).not.toBeNull()

    await user.click(within(songCard as HTMLElement).getByRole('button', { name: /新建歌曲/ }))

    const dialogTitle = await screen.findByRole('heading', { name: '新建歌曲' })
    const dialog = dialogTitle.closest('div[class*="fixed"]')?.parentElement
    expect(dialog).not.toBeNull()
    expect(within(dialog as HTMLElement).getByPlaceholderText('例如：夜空中最亮的星')).toBeInTheDocument()
  })

  it('opens the create song dialog from the empty song state', async () => {
    const { getMaterialDetail } = await import('@/lib/api/materials')
    const detail = createMockMaterialDetail()
    detail.items = []
    vi.mocked(getMaterialDetail).mockResolvedValue({
      success: true,
      data: detail,
    })

    const user = userEvent.setup()
    render(<ArtistWorkspace materialId="artist-1" />)

    await user.click(await screen.findByRole('button', { name: /新建歌曲/ }))

    expect(screen.getByRole('heading', { name: '新建歌曲' })).toBeInTheDocument()
    expect(screen.getByText('创建一首新歌曲，可以添加歌词和风格提示词')).toBeInTheDocument()
  })

  it('creates song-level prompts locally without refetching detail', async () => {
    const { getMaterialDetail } = await import('@/lib/api/materials')
    const { createPrompt } = await import('@/lib/api/prompts')
    const detail = createMockMaterialDetail()

    vi.mocked(createPrompt).mockResolvedValue({
      success: true,
      data: {
        id: 'song-prompt-3',
        target_type: 'material-item',
        target_id: 'song-2',
        slot_type: 'song-style',
        name: '歌曲风格C',
        content: '歌曲风格C内容',
        sort_order: 1,
        is_default: false,
        owner_id: 'user-1',
        is_deleted: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        deleted_at: null,
      },
    })

    const user = userEvent.setup()
    render(<ArtistWorkspace materialId="artist-1" initialDetail={detail} />)

    await user.click(screen.getByRole('button', { name: /^Red Sunset点击切换到这首歌的风格候选与歌词上下文$/ }))

    const songPromptCard = screen.getByText('歌曲风格 Prompt').closest('[class*="rounded"]')
    expect(songPromptCard).not.toBeNull()

    await user.click(within(songPromptCard as HTMLElement).getByRole('button', { name: /新建提示词/ }))
    const dialogTitle = await screen.findByRole('heading', { name: '新建提示词' })
    const dialog = dialogTitle.closest('div[class*="fixed"]')?.parentElement
    expect(dialog).not.toBeNull()

    await user.type(within(dialog as HTMLElement).getByPlaceholderText('例如：摇滚风格'), '歌曲风格C')
    const promptContentFields = within(dialog as HTMLElement).getAllByPlaceholderText('输入提示词内容...')
    await user.type(promptContentFields[promptContentFields.length - 1], '歌曲风格C内容')
    await user.click(within(dialog as HTMLElement).getByRole('button', { name: '创建提示词' }))

    expect(createPrompt).toHaveBeenCalledWith({
      target_type: 'material-item',
      target_id: 'song-2',
      slot_type: 'song-style',
      name: '歌曲风格C',
      content: '歌曲风格C内容',
      is_default: false,
    })
    expect(getMaterialDetail).not.toHaveBeenCalled()
    expect(await screen.findByText('歌曲风格C')).toBeInTheDocument()
  })

  it('opens the create song-style prompt dialog from the empty song prompt state', async () => {
    const { getMaterialDetail } = await import('@/lib/api/materials')
    const detail = createMockMaterialDetail()
    detail.items = [
      {
        ...detail.items[0],
        prompts: [],
      },
    ]
    vi.mocked(getMaterialDetail).mockResolvedValue({
      success: true,
      data: detail,
    })

    const user = userEvent.setup()
    render(<ArtistWorkspace materialId="artist-1" />)

    const songPromptPanelTitle = await screen.findByText('歌曲风格 Prompt')
    const songPromptPanel = songPromptPanelTitle.closest('[class*="rounded"]')
    expect(songPromptPanel).not.toBeNull()

    await user.click(within(songPromptPanel as HTMLElement).getByRole('button', { name: /新建提示词/ }))

    expect(screen.getByRole('heading', { name: '新建提示词' })).toBeInTheDocument()
    expect(screen.getByText('创建一个新的歌曲风格提示词候选')).toBeInTheDocument()
  })
})
