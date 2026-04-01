import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { WelcomeModal } from './WelcomeModal'
import { QuickStartGuide, QuickStartGuideCompact } from './QuickStartGuide'

describe('WelcomeModal', () => {
  const mockOnClose = vi.fn()
  const mockOnDontShowAgain = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render when open is true', () => {
    render(
      <MemoryRouter>
        <WelcomeModal
          open={true}
          onClose={mockOnClose}
          onDontShowAgain={mockOnDontShowAgain}
          dontShowAgain={false}
        />
      </MemoryRouter>
    )

    expect(screen.getByText('欢迎使用 MiniMax AI 工具集')).toBeInTheDocument()
    expect(screen.getByText(/这是一个强大的 AI 工具集/)).toBeInTheDocument()
  })

  it('should not render when open is false', () => {
    render(
      <MemoryRouter>
        <WelcomeModal
          open={false}
          onClose={mockOnClose}
          onDontShowAgain={mockOnDontShowAgain}
          dontShowAgain={false}
        />
      </MemoryRouter>
    )

    expect(screen.queryByText('欢迎使用 MiniMax AI 工具集')).not.toBeInTheDocument()
  })

  it('should call onClose when close button is clicked', () => {
    render(
      <MemoryRouter>
        <WelcomeModal
          open={true}
          onClose={mockOnClose}
          onDontShowAgain={mockOnDontShowAgain}
          dontShowAgain={false}
        />
      </MemoryRouter>
    )

    const closeButton = screen.getByText('关闭')
    fireEvent.click(closeButton)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('should call onClose when overlay is clicked', () => {
    const { container } = render(
      <MemoryRouter>
        <WelcomeModal
          open={true}
          onClose={mockOnClose}
          onDontShowAgain={mockOnDontShowAgain}
          dontShowAgain={false}
        />
      </MemoryRouter>
    )

    const overlay = container.querySelector('[class*="bg-black/80"]')
    if (overlay) {
      fireEvent.click(overlay)
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    }
  })

  it('should call onDontShowAgain when checkbox is clicked', () => {
    render(
      <MemoryRouter>
        <WelcomeModal
          open={true}
          onClose={mockOnClose}
          onDontShowAgain={mockOnDontShowAgain}
          dontShowAgain={false}
        />
      </MemoryRouter>
    )

    const checkbox = screen.getByLabelText('不再显示')
    fireEvent.click(checkbox)

    expect(mockOnDontShowAgain).toHaveBeenCalledWith(true)
  })

  it('should navigate to settings when set API key button is clicked', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <WelcomeModal
          open={true}
          onClose={mockOnClose}
          onDontShowAgain={mockOnDontShowAgain}
          dontShowAgain={false}
        />
      </MemoryRouter>
    )

    const setApiKeyButton = screen.getByText('设置 API Key')
    fireEvent.click(setApiKeyButton)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('should dismiss when start exploring button is clicked', () => {
    render(
      <MemoryRouter>
        <WelcomeModal
          open={true}
          onClose={mockOnClose}
          onDontShowAgain={mockOnDontShowAgain}
          dontShowAgain={false}
        />
      </MemoryRouter>
    )

    const startButton = screen.getByText('开始使用')
    fireEvent.click(startButton)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('should render quick action buttons', () => {
    render(
      <MemoryRouter>
        <WelcomeModal
          open={true}
          onClose={mockOnClose}
          onDontShowAgain={mockOnDontShowAgain}
          dontShowAgain={false}
        />
      </MemoryRouter>
    )

    expect(screen.getByText('设置 API Key')).toBeInTheDocument()
    expect(screen.getByText('配置 MiniMax API 以开始使用')).toBeInTheDocument()
    expect(screen.getByText('开始使用')).toBeInTheDocument()
    expect(screen.getByText('直接探索各项功能')).toBeInTheDocument()
  })
})

describe('QuickStartGuide', () => {
  const mockOnStepClick = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render all steps', () => {
    render(
      <MemoryRouter>
        <QuickStartGuide onStepClick={mockOnStepClick} />
      </MemoryRouter>
    )

    expect(screen.getByText('配置 API Key')).toBeInTheDocument()
    expect(screen.getByText('体验文本生成')).toBeInTheDocument()
    expect(screen.getByText('探索定时任务')).toBeInTheDocument()
    expect(screen.getByText('管理生成内容')).toBeInTheDocument()
  })

  it('should show progress based on completed steps', () => {
    render(
      <MemoryRouter>
        <QuickStartGuide
          onStepClick={mockOnStepClick}
          completedSteps={['api-key', 'text-gen']}
        />
      </MemoryRouter>
    )

    expect(screen.getByText('2/4')).toBeInTheDocument()
    expect(screen.getAllByText('已完成')).toHaveLength(2)
  })

  it('should call onStepClick when step is clicked', () => {
    render(
      <MemoryRouter>
        <QuickStartGuide onStepClick={mockOnStepClick} />
      </MemoryRouter>
    )

    const stepButton = screen.getByText('配置 API Key').closest('button')
    if (stepButton) {
      fireEvent.click(stepButton)
      expect(mockOnStepClick).toHaveBeenCalledWith('api-key')
    }
  })

  it('should show correct icons for completed and incomplete steps', () => {
    render(
      <MemoryRouter>
        <QuickStartGuide
          onStepClick={mockOnStepClick}
          completedSteps={['api-key']}
        />
      </MemoryRouter>
    )

    const completedBadges = screen.getAllByText('已完成')
    expect(completedBadges).toHaveLength(1)
  })
})

describe('QuickStartGuideCompact', () => {
  const mockOnDismiss = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render compact quick links', () => {
    render(
      <MemoryRouter>
        <QuickStartGuideCompact onDismiss={mockOnDismiss} />
      </MemoryRouter>
    )

    expect(screen.getByText('快速开始')).toBeInTheDocument()
    expect(screen.getByText('配置 API Key')).toBeInTheDocument()
    expect(screen.getByText('体验文本生成')).toBeInTheDocument()
    expect(screen.getByText('探索定时任务')).toBeInTheDocument()
    expect(screen.getByText('管理生成内容')).toBeInTheDocument()
  })

  it('should call onDismiss when dismiss button is clicked', () => {
    render(
      <MemoryRouter>
        <QuickStartGuideCompact onDismiss={mockOnDismiss} />
      </MemoryRouter>
    )

    const dismissButton = screen.getByText('隐藏')
    fireEvent.click(dismissButton)

    expect(mockOnDismiss).toHaveBeenCalledTimes(1)
  })
})
