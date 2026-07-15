import * as React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import Header from './Header'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'zh' },
  }),
}))

vi.mock('react-router-dom', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="/">{children}</a>,
  useNavigate: () => vi.fn(),
}))

vi.mock('@/i18n', () => ({ switchLanguage: vi.fn() }))

vi.mock('@/settings/store', () => ({
  useSettingsStore: () => ({
    settings: { api: { minimaxKey: '', region: 'cn', mode: 'direct' } },
    setCategory: vi.fn(),
  }),
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    user: { username: 'qa', email: 'qa@example.com', role: 'user' },
    accessToken: null,
    logout: vi.fn(),
  }),
}))

vi.mock('@/lib/api/auth', () => ({ logout: vi.fn() }))

vi.mock('framer-motion', () => ({
  motion: {
    button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button {...props}>{children}</button>
    ),
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('@/themes/tokens', () => ({
  status: {},
  roles: {
    user: { bgLight: 'bg-user', text: 'text-user' },
    super: { bgLight: 'bg-super', text: 'text-super' },
    admin: { bgLight: 'bg-admin', text: 'text-admin' },
    pro: { bgLight: 'bg-pro', text: 'text-pro' },
  },
}))

vi.mock('@/lib/utils', () => ({ cn: (...values: Array<string | undefined>) => values.filter(Boolean).join(' ') }))

describe('Header mobile layout', () => {
  it('375px 下收缩品牌与次要用户操作，保留核心语言/区域/模式控件', () => {
    render(<Header />)

    expect(screen.getByText('Mnx-Agent 工作台').className).toContain('hidden')
    expect(screen.getByTitle('header.configKey').parentElement?.className).toContain('hidden')
    expect(screen.getByText('user').closest('button')?.parentElement?.className).toContain('hidden')
  })
})
