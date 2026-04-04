import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
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

describe('ActionConfigPanel', () => {
  const mockOnChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
      json: () => Promise.resolve({ success: true, data: mockAvailableActions }),
    })))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
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
    render(<ActionConfigPanel config={{ service: '', method: '', args: ['test'] }} onChange={mockOnChange} />)

    await waitFor(() => {
      expect(screen.getByText('Arguments (JSON)')).toBeInTheDocument()
    })

    const input = screen.getByDisplayValue('["test"]')
    expect(input).toBeInTheDocument()
  })

  it('displays arguments correctly when empty', async () => {
    render(<ActionConfigPanel config={{ service: '', method: '' }} onChange={mockOnChange} />)

    await waitFor(() => {
      expect(screen.getByText('Arguments (JSON)')).toBeInTheDocument()
    })

    const input = screen.getByDisplayValue('[]')
    expect(input).toBeInTheDocument()
  })
})