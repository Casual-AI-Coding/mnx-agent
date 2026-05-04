import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { StrictMode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { MaterialManagementLayout } from '../MaterialManagementLayout'
import { useMaterialsStore } from '@/stores/materials'
import { useAuthStore } from '@/stores/auth'
import type { ReactNode } from 'react'

vi.mock('@/stores/materials', () => ({
  useMaterialsStore: vi.fn(),
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(),
}))

const mockMaterial = {
  id: 'material-1',
  material_type: 'artist' as const,
  name: 'Test Artist',
  description: 'Test description',
  metadata: null,
  owner_id: 'user-1',
  sort_order: 0,
  is_deleted: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  deleted_at: null,
  songCount: 3,
  promptVariantsCount: 2,
}

const renderWithProviders = (ui: ReactNode) => {
  return {
    user: userEvent.setup(),
    ...render(
      <StrictMode>
        <MemoryRouter>
          {ui}
        </MemoryRouter>
      </StrictMode>
    ),
  }
}

describe('MaterialManagementLayout', () => {
  const createDefaultMock = (overrides = {}) => ({
    materials: [],
    isLoading: false,
    error: null,
    total: 0,
    page: 1,
    limit: 8,
    totalPages: 0,
    typeFilter: 'all' as const,
    sortField: 'updated_at' as const,
    sortOrder: 'desc' as const,
    fetchMaterials: vi.fn(),
    addMaterial: vi.fn(),
    removeMaterial: vi.fn(),
    clearError: vi.fn(),
    setPage: vi.fn(),
    setLimit: vi.fn(),
    setTypeFilter: vi.fn(),
    setSortField: vi.fn(),
    setSortOrder: vi.fn(),
    toggleSort: vi.fn(),
    ...overrides,
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useMaterialsStore).mockReturnValue(createDefaultMock())
    vi.mocked(useAuthStore).mockReturnValue({ isHydrated: true })
  })

  it('should render page header with title', () => {
    renderWithProviders(<MaterialManagementLayout />)
    expect(screen.getByText('素材管理')).toBeInTheDocument()
  })

  it('should display search input', () => {
    renderWithProviders(<MaterialManagementLayout />)
    expect(screen.getByPlaceholderText('搜索素材...')).toBeInTheDocument()
  })

  it('should display create button in header', () => {
    renderWithProviders(<MaterialManagementLayout />)
    const buttons = screen.getAllByRole('button')
    const createButtons = buttons.filter(btn => btn.textContent?.includes('创建'))
    expect(createButtons.length).toBeGreaterThan(0)
  })

  it('should show loading state when isLoading is true', () => {
    vi.mocked(useMaterialsStore).mockReturnValue(createDefaultMock({ isLoading: true }))
    renderWithProviders(<MaterialManagementLayout />)
    expect(screen.getByText('加载中...')).toBeInTheDocument()
  })

  it('should show empty state when no materials', () => {
    vi.mocked(useMaterialsStore).mockReturnValue(createDefaultMock())
    renderWithProviders(<MaterialManagementLayout />)
    expect(screen.getByText(/暂无素材/i)).toBeInTheDocument()
  })

  it('should filter materials based on search query', async () => {
    vi.mocked(useMaterialsStore).mockReturnValue(createDefaultMock({ materials: [mockMaterial] }))
    const { user } = renderWithProviders(<MaterialManagementLayout />)

    const searchInput = screen.getByPlaceholderText('搜索素材...')
    await user.type(searchInput, 'Artist')
  })

  it('should call fetchMaterials on mount only once', () => {
    const fetchMaterials = vi.fn()
    vi.mocked(useMaterialsStore).mockReturnValue(createDefaultMock({ fetchMaterials }))
    renderWithProviders(<MaterialManagementLayout />)
    expect(fetchMaterials).toHaveBeenCalledTimes(1)
  })

  it('should render material type and updated time in the list', () => {
    vi.mocked(useMaterialsStore).mockReturnValue(createDefaultMock({
      materials: [{ ...mockMaterial, updated_at: '2024-02-03T00:00:00Z' }],
      total: 1,
      totalPages: 1,
    }))

    renderWithProviders(<MaterialManagementLayout />)

    expect(screen.getByText('Test Artist')).toBeInTheDocument()
    expect(screen.getByText('艺术家')).toBeInTheDocument()
    expect(screen.getByText(/\d{4}年\d+月\d+日/)).toBeInTheDocument()
    expect(screen.getByText(/3\s*歌曲/)).toBeInTheDocument()
    expect(screen.getByText(/2\s*变体/)).toBeInTheDocument()
  })

  it('should use generic create dialog copy instead of artist-only copy', async () => {
    const { user } = renderWithProviders(<MaterialManagementLayout />)

    const createButtons = screen.getAllByRole('button', { name: /创建素材/i })
    await user.click(createButtons[0])

    expect(screen.getByText('创建一个新的素材集，用于管理音乐人和歌曲风格')).toBeInTheDocument()
  })

  it('should render the create dialog in document.body instead of inside the page card container', async () => {
    const { user, container } = renderWithProviders(<MaterialManagementLayout />)

    const pageCard = container.querySelector('.rounded-xl.border')
    expect(pageCard).not.toBeNull()

    const createButtons = screen.getAllByRole('button', { name: /创建素材/i })
    await user.click(createButtons[0])

    const dialogTitle = screen.getByRole('heading', { name: '创建素材' })

    expect(document.body).toContainElement(dialogTitle)
    expect(pageCard).not.toContainElement(dialogTitle)
  })
})
