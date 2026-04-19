import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MediaCard } from './MediaCard'
import type { MediaRecord } from '@/types/media'

// Mock MediaCardPreview for test isolation
const mockMediaCardPreview = vi.fn()
vi.mock('./MediaCardPreview', () => ({
  MediaCardPreview: (props: { visible?: boolean }) => {
    mockMediaCardPreview(props)
    if (!props.visible) return null
    return (
      <div data-testid="media-card-preview">
        Preview: {JSON.stringify(props)}
      </div>
    )
  },
}))

// Mock lucide-react icons - must mock all icons used by dependencies
vi.mock('lucide-react', () => ({
  Eye: () => <span data-testid="eye-icon">Eye</span>,
  Download: () => <span data-testid="download-icon">Download</span>,
  Trash2: () => <span data-testid="trash-icon">Trash</span>,
  CheckSquare: () => <span data-testid="check-square-icon">Check</span>,
  Square: () => <span data-testid="square-icon">Square</span>,
  RefreshCw: () => <span data-testid="refresh-icon">Refresh</span>,
  Image: () => <span data-testid="image-icon">Image</span>,
  FileAudio: () => <span data-testid="file-audio-icon">FileAudio</span>,
  FileVideo: () => <span data-testid="file-video-icon">FileVideo</span>,
  Music: () => <span data-testid="music-icon">Music</span>,
  Video: () => <span data-testid="video-icon">Video</span>,
  FileText: vi.fn(() => <div data-icon="FileText" />),
  Pencil: vi.fn(() => <div data-icon="Pencil" />),
  Star: vi.fn(() => <div data-icon="Star" />),
  Globe: vi.fn(() => <div data-icon="Globe" />),
  Lock: vi.fn(() => <div data-icon="Lock" />),
}))

// Mock UI components
vi.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button onClick={onClick} {...props} data-testid="button">
      {children}
    </button>
  ),
}))

vi.mock('@/components/ui/Badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="badge">{children}</span>
  ),
}))

const mockRecord: MediaRecord = {
  id: '1',
  filename: 'test-image.png',
  original_name: 'Test Image',
  type: 'image',
  size_bytes: 1024,
  storage_path: '/test/path.png',
  source: 'upload',
  is_deleted: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const mockAudioRecord: MediaRecord = {
  ...mockRecord,
  id: '2',
  filename: 'test-audio.mp3',
  original_name: 'Test Audio',
  type: 'audio',
}

const mockProps = {
  isSelected: false,
  onSelect: vi.fn(),
  onPreview: vi.fn(),
  onDownload: vi.fn(),
  onDelete: vi.fn(),
}

describe('MediaCard Hover Preview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('shows preview on hover for images with signedUrl', async () => {
    const signedUrl = 'https://example.com/image.png'
    
    render(<MediaCard {...mockProps} record={mockRecord} signedUrl={signedUrl} />)
    
    const card = screen.getByText(/Test Image/).closest('[class*="relative"]') || 
                 document.querySelector('.relative.aspect-\\[4\\/3\\]') ||
                 screen.getByText(/Test Image/).parentElement?.parentElement?.parentElement?.parentElement
    
    expect(card).toBeTruthy()
    
    if (card) {
      fireEvent.mouseEnter(card)
      
      await waitFor(() => {
        expect(mockMediaCardPreview).toHaveBeenCalled()
      })
      
      const lastCall = mockMediaCardPreview.mock.calls[mockMediaCardPreview.mock.calls.length - 1][0]
      expect(lastCall.visible).toBe(true)
      expect(lastCall.signedUrl).toBe(signedUrl)
      expect(lastCall.record).toEqual(mockRecord)
    }
  })

  test('does not show preview for non-image types', async () => {
    render(<MediaCard {...mockProps} record={mockAudioRecord} signedUrl="https://example.com/audio.mp3" />)
    
    const card = screen.getByText(/Test Audio/).closest('[class*="relative"]') || 
                 document.querySelector('.relative.aspect-\\[4\\/3\\]') ||
                 screen.getByText(/Test Audio/).parentElement?.parentElement?.parentElement?.parentElement
    
    expect(card).toBeTruthy()
    
    if (card) {
      fireEvent.mouseEnter(card)
      
      // Wait a bit and check that preview was not rendered
      await new Promise(resolve => setTimeout(resolve, 50))
      
      // Get all calls and check if any have visible=true for audio
      const visibleCalls = mockMediaCardPreview.mock.calls.filter(
        call => call[0].visible === true && call[0].record?.type === 'audio'
      )
      expect(visibleCalls.length).toBe(0)
    }
  })

  test('does not show preview when signedUrl is missing', async () => {
    render(<MediaCard {...mockProps} record={mockRecord} signedUrl={undefined} />)
    
    const card = screen.getByText(/Test Image/).closest('[class*="relative"]') || 
                 document.querySelector('.relative.aspect-\\[4\\/3\\]') ||
                 screen.getByText(/Test Image/).parentElement?.parentElement?.parentElement?.parentElement
    
    expect(card).toBeTruthy()
    
    if (card) {
      fireEvent.mouseEnter(card)
      
      // Wait a bit and check that preview was not rendered with missing signedUrl
      await new Promise(resolve => setTimeout(resolve, 50))
      
      // Get all calls and check if any have visible=true with undefined signedUrl
      const visibleCalls = mockMediaCardPreview.mock.calls.filter(
        call => call[0].visible === true && !call[0].signedUrl
      )
      expect(visibleCalls.length).toBe(0)
    }
  })

  test('tracks mouse position on mouse move', async () => {
    const signedUrl = 'https://example.com/image.png'
    
    render(<MediaCard {...mockProps} record={mockRecord} signedUrl={signedUrl} />)
    
    const card = screen.getByText(/Test Image/).closest('[class*="relative"]') || 
                 document.querySelector('.relative.aspect-\\[4\\/3\\]') ||
                 screen.getByText(/Test Image/).parentElement?.parentElement?.parentElement?.parentElement
    
    expect(card).toBeTruthy()
    
    if (card) {
      fireEvent.mouseEnter(card)
      
      fireEvent.mouseMove(card, { clientX: 100, clientY: 200 })
      
      await waitFor(() => {
        expect(mockMediaCardPreview).toHaveBeenCalled()
      })
      
      const lastCall = mockMediaCardPreview.mock.calls[mockMediaCardPreview.mock.calls.length - 1][0]
      expect(lastCall.mousePosition).toEqual({ x: 100, y: 200 })
    }
  })

  test('hides preview on mouse leave', async () => {
    const signedUrl = 'https://example.com/image.png'
    
    render(<MediaCard {...mockProps} record={mockRecord} signedUrl={signedUrl} />)
    
    const card = screen.getByText(/Test Image/).closest('[class*="relative"]') || 
                 document.querySelector('.relative.aspect-\\[4\\/3\\]') ||
                 screen.getByText(/Test Image/).parentElement?.parentElement?.parentElement?.parentElement
    
    expect(card).toBeTruthy()
    
    if (card) {
      fireEvent.mouseEnter(card)
      
      await waitFor(() => {
        expect(mockMediaCardPreview).toHaveBeenCalled()
      })
      
      fireEvent.mouseLeave(card)
      
      // After mouse leave, visible should be false
      const lastCall = mockMediaCardPreview.mock.calls[mockMediaCardPreview.mock.calls.length - 1][0]
      expect(lastCall.visible).toBe(false)
    }
  })
})
