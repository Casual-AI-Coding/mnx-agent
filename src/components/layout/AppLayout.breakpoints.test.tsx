import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

import AppLayout from './AppLayout'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('./Header', () => ({
  default: ({ onMenuClick }: { onMenuClick?: () => void }) => (
    <header>
      <button type="button" aria-label="open-menu" onClick={onMenuClick}>菜单</button>
    </header>
  ),
}))

vi.mock('./Sidebar', () => ({
  default: () => <aside data-testid="sidebar">侧边栏</aside>,
}))

vi.mock('./HistoryPanel', () => ({
  default: () => <div>历史面板</div>,
}))

vi.mock('./AnnouncementBanner', () => ({
  default: () => <div>全局公告横幅</div>,
}))

vi.mock('@/components/media/AudioPlayer', () => ({
  AudioPlayer: () => <div>播放器</div>,
}))

vi.mock('@/settings/store', () => ({
  useSettingsStore: () => ({
    settings: { api: { minimaxKey: '' } },
    setCategory: vi.fn(),
    initialize: vi.fn(),
    saveSettings: vi.fn(),
  }),
}))

vi.mock('@/settings/store/defaults', () => ({
  DEFAULT_SETTINGS: { api: { minimaxKey: '' } },
}))

vi.mock('@/stores/audio', () => ({
  useAudioStore: () => ({
    currentRecord: null,
    playlist: [],
    currentIndex: 0,
    signedUrl: null,
    playPrev: vi.fn(),
    playNext: vi.fn(),
    close: vi.fn(),
  }),
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ isHydrated: true }),
}))

const motionTransitionCalls: Array<{ duration?: number } | undefined> = []
const motionInitialCalls: Array<Record<string, unknown> | false> = []
const motionExitCalls: Array<Record<string, unknown>> = []

vi.mock('framer-motion', async () => {
  const React = await import('react')
  const ProxyMotion = new Proxy(
    {},
    {
      get: (_target, prop: string) => {
        if (prop === 'div') return MotionDiv
        return undefined
      },
    }
  )
  function MotionDiv(props: Record<string, unknown>) {
    motionInitialCalls.push(props.initial as Record<string, unknown> | false)
    motionExitCalls.push(props.exit as Record<string, unknown>)
    motionTransitionCalls.push(props.transition as { duration?: number } | undefined)
    const { children, className, onClick, ...rest } = props
    return React.createElement('div', { className, onClick, ...rest }, children as React.ReactNode)
  }
  return {
    motion: ProxyMotion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  }
})

function mockMatchMedia(desktopMatch: boolean, reducedMotion: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => {
      const isDesktopQuery = query.includes('min-width: 1024px')
      const isReducedMotionQuery = query.includes('prefers-reduced-motion')
      return {
        matches: isDesktopQuery ? desktopMatch : isReducedMotionQuery ? reducedMotion : false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }
    }),
  })
}

function clearMotionCalls() {
  motionTransitionCalls.length = 0
  motionInitialCalls.length = 0
  motionExitCalls.length = 0
}

describe('AppLayout — breakpoints + reduced-motion', () => {
  beforeEach(() => {
    clearMotionCalls()
  })

  it.each([
    [375, false],
    [768, false],
    [1024, true],
    [1440, true],
  ])('viewport=%i px → matchMedia 调用 %s', (_width, desktopMatch) => {
    mockMatchMedia(desktopMatch, false)
    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>
    )
    expect(window.matchMedia).toHaveBeenCalledWith('(min-width: 1024px)')
  })

  it('prefers-reduced-motion=true 时抽屉和遮罩禁用过渡动画', async () => {
    mockMatchMedia(false, true)
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>
    )
    clearMotionCalls()
    await user.click(screen.getByLabelText('open-menu'))
    expect(motionInitialCalls.length).toBeGreaterThan(0)
    motionInitialCalls.forEach((initial) => {
      expect(initial).toBe(false)
    })
    motionTransitionCalls.forEach((transition) => {
      expect(transition).toMatchObject({ duration: 0 })
    })
  })

  it('prefers-reduced-motion=false 时抽屉使用 spring 过渡', async () => {
    mockMatchMedia(false, false)
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>
    )
    clearMotionCalls()
    await user.click(screen.getByLabelText('open-menu'))
    const hasSpringTransition = motionTransitionCalls.some(
      (t) => t && typeof t === 'object' && 'type' in t && t.type === 'spring'
    )
    expect(hasSpringTransition).toBe(true)
  })

  it('prefers-reduced-motion=true 时 apiKey 模态禁用 scale 动画', async () => {
    mockMatchMedia(false, true)
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>
    )
    clearMotionCalls()
    await user.click(screen.getByLabelText('open-menu'))
    const overlay = document.querySelector('.fixed.inset-0.bg-foreground\\/30') as HTMLElement | null
    expect(overlay).toBeTruthy()
    await user.click(overlay!)
    expect(motionInitialCalls.length).toBeGreaterThan(0)
    motionInitialCalls.forEach((initial) => {
      expect(initial).toBe(false)
    })
  })
})