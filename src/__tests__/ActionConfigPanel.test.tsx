import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ActionConfigPanel } from '@/components/workflow/config-panels/ActionConfigPanel'

const mockAvailableActions = {
  'MiniMax API': [
    { id: '1', service: 'minimaxClient', method: 'chatCompletion', label: 'Text Generation', minRole: 'pro' },
    { id: '2', service: 'minimaxClient', method: 'imageGeneration', label: 'Image Generation', minRole: 'pro' },
  ],
  'Database': [
    { id: '3', service: 'dbService', method: 'query', label: 'Run Query', minRole: 'admin' },
  ],
}

vi.mock('@/lib/api/workflow-actions', () => ({
  fetchAvailableActions: vi.fn(() => Promise.resolve(mockAvailableActions)),
  clearActionsCache: vi.fn(),
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ isHydrated: true }),
}))

describe('ActionConfigPanel', () => {
  const mockOnChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state initially', () => {
    render(<ActionConfigPanel config={{ service: '', method: '' }} onChange={mockOnChange} />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders category dropdown after loading', async () => {
    render(<ActionConfigPanel config={{ service: '', method: '' }} onChange={mockOnChange} />)

    await waitFor(() => {
      expect(screen.getByText('Category')).toBeInTheDocument()
    })
  })

  it('renders arguments input with JSON editor', async () => {
    render(<ActionConfigPanel config={{ service: 'dbService', method: 'query', args: ['test'] }} onChange={mockOnChange} />)

    await waitFor(() => {
      expect(screen.getByText('Arguments (JSON)')).toBeInTheDocument()
    })

    const input = screen.getByDisplayValue('["test"]')
    expect(input).toBeInTheDocument()
  })

  it('displays arguments correctly when empty', async () => {
    render(<ActionConfigPanel config={{ service: 'dbService', method: 'query' }} onChange={mockOnChange} />)

    await waitFor(() => {
      expect(screen.getByText('Arguments (JSON)')).toBeInTheDocument()
    })

    const input = screen.getByDisplayValue('[]')
    expect(input).toBeInTheDocument()
  })
})