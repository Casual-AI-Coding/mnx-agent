import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AnimatedMediaGrid } from './AnimatedMediaGrid'
import type { MediaRecord } from '@/types/media'
import { AnimatePresence } from 'framer-motion'

vi.mock('framer-motion', () => ({
  motion: {
    div: vi.fn((props: any) => {
      if (props.custom && typeof props.custom === 'function') {
        props.custom()
      }
      return <div {...props}>{props.children}</div>
    }),
  },
  AnimatePresence: vi.fn(({ children }) => <>{children}</>),
}))

vi.mock('./MediaCard', () => ({
  MediaCard: vi.fn((props: any) => (
    <div data-testid="media-card" data-record-id={props.record.id}>
      <span data-testid="record-name">{props.record.original_name}</span>
      <span data-testid="is-selected">{props.isSelected ? 'selected' : 'not-selected'}</span>
      <button data-testid="preview-btn" onClick={props.onPreview}>Preview</button>
      <button data-testid="download-btn" onClick={props.onDownload}>Download</button>
      <button data-testid="delete-btn" onClick={props.onDelete}>Delete</button>
      <button data-testid="select-btn" onClick={props.onSelect}>Select</button>
    </div>
  )),
}))

vi.mock('@/lib/animations/media-variants', () => ({
  getRandomFlyInDirection: vi.fn(() => ({ startX: 0, startY: 100 })),
  gridContainerVariants: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  cardVariants: {
    hidden: () => ({ opacity: 0, scale: 0.8 }),
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 },
  },
}))

describe('AnimatedMediaGrid', () => {
  const mockRecords: MediaRecord[] = [
    {
      id: '1',
      type: 'image',
      filename: 'test1.png',
      original_name: 'Test Image 1',
      storage_path: '/test1.png',
      size_bytes: 1024,
      mime_type: 'image/png',
      source: 'generation',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '2',
      type: 'audio',
      filename: 'test2.mp3',
      original_name: 'Test Audio 2',
      storage_path: '/test2.mp3',
      size_bytes: 2048,
      mime_type: 'audio/mpeg',
      source: 'generation',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '3',
      type: 'video',
      filename: 'test3.mp4',
      original_name: 'Test Video 3',
      storage_path: '/test3.mp4',
      size_bytes: 4096,
      mime_type: 'video/mp4',
      source: 'generation',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]

  const mockSignedUrls: Record<string, string> = {
    '1': 'https://example.com/signed1.png',
    '2': 'https://example.com/signed2.mp3',
    '3': 'https://example.com/signed3.mp4',
  }

  const mockCallbacks = {
    onSelect: vi.fn(),
    onPreview: vi.fn(),
    onDownload: vi.fn(),
    onDelete: vi.fn(),
  }

  it('renders all records passed in', () => {
    render(
      <AnimatedMediaGrid
        records={mockRecords}
        signedUrls={mockSignedUrls}
        selectedIds={new Set()}
        {...mockCallbacks}
      />
    )

    const mediaCards = screen.getAllByTestId('media-card')
    expect(mediaCards).toHaveLength(3)
    expect(screen.getByText('Test Image 1')).toBeInTheDocument()
    expect(screen.getByText('Test Audio 2')).toBeInTheDocument()
    expect(screen.getByText('Test Video 3')).toBeInTheDocument()
  })

  it('handles empty grid gracefully', () => {
    const { container } = render(
      <AnimatedMediaGrid
        records={[]}
        signedUrls={mockSignedUrls}
        selectedIds={new Set()}
        {...mockCallbacks}
      />
    )

    const mediaCards = screen.queryAllByTestId('media-card')
    expect(mediaCards).toHaveLength(0)

    expect(container.querySelector('.grid')).toBeInTheDocument()
  })

  it('passes correct props to MediaCard', () => {
    render(
      <AnimatedMediaGrid
        records={mockRecords}
        signedUrls={mockSignedUrls}
        selectedIds={new Set(['1'])}
        {...mockCallbacks}
      />
    )

    const mediaCards = screen.getAllByTestId('media-card')
    expect(mediaCards[0]).toHaveAttribute('data-record-id', '1')

    expect(screen.getAllByTestId('is-selected')[0]).toHaveTextContent('selected')

    expect(screen.getAllByTestId('is-selected')[1]).toHaveTextContent('not-selected')
    expect(screen.getAllByTestId('is-selected')[2]).toHaveTextContent('not-selected')
  })

  it('calls callbacks when MediaCard triggers them', () => {
    render(
      <AnimatedMediaGrid
        records={mockRecords}
        signedUrls={mockSignedUrls}
        selectedIds={new Set()}
        {...mockCallbacks}
      />
    )

    const previewButtons = screen.getAllByTestId('preview-btn')
    fireEvent.click(previewButtons[0])
    expect(mockCallbacks.onPreview).toHaveBeenCalledWith(mockRecords[0])

    const downloadButtons = screen.getAllByTestId('download-btn')
    fireEvent.click(downloadButtons[1])
    expect(mockCallbacks.onDownload).toHaveBeenCalledWith(mockRecords[1])

    const deleteButtons = screen.getAllByTestId('delete-btn')
    fireEvent.click(deleteButtons[2])
    expect(mockCallbacks.onDelete).toHaveBeenCalledWith(mockRecords[2])

    const selectButtons = screen.getAllByTestId('select-btn')
    fireEvent.click(selectButtons[0])
    expect(mockCallbacks.onSelect).toHaveBeenCalledWith(mockRecords[0])
  })

  it('applies correct CSS grid classes', () => {
    const { container } = render(
      <AnimatedMediaGrid
        records={mockRecords}
        signedUrls={mockSignedUrls}
        selectedIds={new Set()}
        {...mockCallbacks}
      />
    )

    const grid = container.querySelector('.grid')
    expect(grid).toHaveClass('grid-cols-1')
    expect(grid).toHaveClass('sm:grid-cols-2')
    expect(grid).toHaveClass('lg:grid-cols-3')
    expect(grid).toHaveClass('xl:grid-cols-4')
    expect(grid).toHaveClass('gap-4')
  })
})
