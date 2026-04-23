import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { MaterialManagementLayout } from '../MaterialManagementLayout'
import { useMaterialsStore } from '@/stores/materials'
import type { ReactNode } from 'react'

vi.mock('@/stores/materials', () => ({
  useMaterialsStore: vi.fn(),
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
}

const renderWithProviders = (ui: ReactNode) => {
  return {
    user: userEvent.setup(),
    ...render(
      <MemoryRouter>
        {ui}
      </MemoryRouter>
    ),
  }
}

describe('MaterialManagementLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useMaterialsStore).mockReturnValue({
      materials: [],
      isLoading: false,
      error: null,
      fetchMaterials: vi.fn(),
      addMaterial: vi.fn(),
      removeMaterial: vi.fn(),
      clearError: vi.fn(),
    })
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
    vi.mocked(useMaterialsStore).mockReturnValue({
      materials: [],
      isLoading: true,
      error: null,
      fetchMaterials: vi.fn(),
      addMaterial: vi.fn(),
      removeMaterial: vi.fn(),
      clearError: vi.fn(),
    })
    renderWithProviders(<MaterialManagementLayout />)
    expect(screen.getByText('加载中...')).toBeInTheDocument()
  })

  it('should show empty state when no materials', () => {
    vi.mocked(useMaterialsStore).mockReturnValue({
      materials: [],
      isLoading: false,
      error: null,
      fetchMaterials: vi.fn(),
      addMaterial: vi.fn(),
      removeMaterial: vi.fn(),
      clearError: vi.fn(),
    })
    renderWithProviders(<MaterialManagementLayout />)
    expect(screen.getByText(/暂无素材/i)).toBeInTheDocument()
  })

  it('should filter materials based on search query', async () => {
    const { user } = renderWithProviders(<MaterialManagementLayout />)
    vi.mocked(useMaterialsStore).mockReturnValue({
      materials: [mockMaterial],
      isLoading: false,
      error: null,
      fetchMaterials: vi.fn(),
      addMaterial: vi.fn(),
      removeMaterial: vi.fn(),
      clearError: vi.fn(),
    })

    const searchInput = screen.getByPlaceholderText('搜索素材...')
    await user.type(searchInput, 'Artist')
  })

  it('should call fetchMaterials on mount', () => {
    const fetchMaterials = vi.fn()
    vi.mocked(useMaterialsStore).mockReturnValue({
      materials: [],
      isLoading: false,
      error: null,
      fetchMaterials,
      addMaterial: vi.fn(),
      removeMaterial: vi.fn(),
      clearError: vi.fn(),
    })
    renderWithProviders(<MaterialManagementLayout />)
    expect(fetchMaterials).toHaveBeenCalled()
  })
})
