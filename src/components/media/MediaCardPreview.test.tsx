import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MediaCardPreview } from './MediaCardPreview'
import type { MediaRecord } from '@/types/media'

vi.mock('react-dom', () => ({
  createPortal: (children: React.ReactNode) => children,
}))

const mockRecord: MediaRecord = {
  id: 'test-1',
  filename: 'test.png',
  original_name: 'Test Image',
  filepath: '/test.png',
  type: 'image',
  mime_type: 'image/png',
  size_bytes: 1024,
  source: 'image_generation',
  task_id: null,
  metadata: null,
  is_deleted: false,
  created_at: '2026-04-09T00:00:00Z',
  updated_at: '2026-04-09T00:00:00Z',
  deleted_at: null,
}

const mockAudioRecord: MediaRecord = {
  ...mockRecord,
  id: 'test-2',
  type: 'audio',
  filename: 'test.mp3',
}

const defaultProps = {
  record: mockRecord,
  signedUrl: 'http://example.com/test.png',
  mousePosition: { x: 100, y: 100 },
  visible: true,
}

describe('MediaCardPreview', () => {
  it('should not render for non-image types', () => {
    const { container } = render(
      <MediaCardPreview {...defaultProps} record={mockAudioRecord} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('should not render when visible is false', () => {
    const { container } = render(
      <MediaCardPreview {...defaultProps} visible={false} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('should not render when signedUrl is empty', () => {
    const { container } = render(
      <MediaCardPreview {...defaultProps} signedUrl="" />
    )
    expect(container.firstChild).toBeNull()
  })

  it('should render image preview when conditions are met', () => {
    render(<MediaCardPreview {...defaultProps} />)
    const img = screen.getByRole('img')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'http://example.com/test.png')
  })
})
