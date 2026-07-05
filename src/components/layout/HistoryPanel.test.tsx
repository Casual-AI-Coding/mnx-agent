import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import HistoryPanel from './HistoryPanel'
import { FORM_PERSISTENCE_KEYS } from '@/hooks/useFormPersistence'
import { useHistoryStore, type HistoryItem } from '@/stores/history'

const navigateSpy = vi.hoisted(() => vi.fn())

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useNavigate: () => navigateSpy,
  }
})

describe('HistoryPanel', () => {
  beforeEach(() => {
    navigateSpy.mockClear()
    window.localStorage.clear()
    useHistoryStore.setState({ items: [] })
  })

  it('reuses stored generation parameters from replayable history items', async () => {
    const user = userEvent.setup()
    const item: HistoryItem = {
      id: 'image-history-1',
      type: 'image',
      timestamp: 1710000000000,
      input: '海边日落',
      outputUrl: 'https://example.test/image.png',
      replaySnapshot: {
        source: 'history',
        label: '图片参数',
        routePath: '/image',
        formPersistenceKey: FORM_PERSISTENCE_KEYS.IMAGE_GENERATION,
        formData: {
          prompt: '海边日落',
          model: 'image-01',
          aspectRatioState: '16:9',
        },
      },
    }

    useHistoryStore.setState({ items: [item] })

    render(
      <MemoryRouter>
        <HistoryPanel isOpen onClose={vi.fn()} />
      </MemoryRouter>
    )

    await user.click(screen.getByRole('button', { name: '复用参数' }))

    expect(window.localStorage.getItem('form-persistence:image-generation')).toBe(JSON.stringify({
      prompt: '海边日落',
      model: 'image-01',
      aspectRatioState: '16:9',
    }))
    expect(navigateSpy).toHaveBeenCalledWith('/image')
    expect(window.localStorage.getItem('history-replay:auto-generate')).toBeNull()
  })

  it('does not show a replay action for legacy history items without snapshots', () => {
    useHistoryStore.setState({
      items: [{
        id: 'legacy-text-1',
        type: 'text',
        timestamp: 1710000000000,
        input: '旧文本',
      }],
    })

    render(
      <MemoryRouter>
        <HistoryPanel isOpen onClose={vi.fn()} />
      </MemoryRouter>
    )

    expect(screen.queryByRole('button', { name: '复用参数' })).not.toBeInTheDocument()
  })
})
