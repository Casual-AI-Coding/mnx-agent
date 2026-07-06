import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

import AppLayout from './AppLayout'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('./Header', () => ({
  default: () => <header>页头</header>,
}))

vi.mock('./Sidebar', () => ({
  default: () => <aside>侧边栏</aside>,
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

describe('AppLayout', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: true,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  it('renders the global announcement banner above routed content', () => {
    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>
    )

    expect(screen.getByText('全局公告横幅')).toBeTruthy()
  })
})
