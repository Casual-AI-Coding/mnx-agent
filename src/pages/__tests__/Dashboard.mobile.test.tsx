import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Dashboard from '../Dashboard'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('framer-motion', () => {
  const React = require('react') as typeof import('react')
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop: string) {
      return ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
        const { initial, animate, transition, whileHover, whileTap, exit, variants, layout, ...domProps } = props
        return React.createElement(prop, domProps, children)
      }
    },
  }
  return { motion: new Proxy({}, handler) }
})

vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
}))

vi.mock('@/components/onboarding/WelcomeModal', () => ({
  WelcomeModal: () => null,
}))

vi.mock('@/components/ui/Card', () => ({
  Card: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => <div className={className}>{children}</div>,
  CardHeader: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => <div className={className}>{children}</div>,
  CardTitle: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => <div className={className}>{children}</div>,
  CardFooter: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => <div className={className}>{children}</div>,
}))

vi.mock('@/components/ui/Badge', () => ({
  Badge: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => <span className={className}>{children}</span>,
}))

vi.mock('@/stores/usage', () => ({
  useUsageStore: () => ({
    usage: { textTokens: 1, imageRequests: 2, musicRequests: 3, videoRequests: 4 },
  }),
}))

vi.mock('@/stores/history', () => ({
  useHistoryStore: () => ({ items: [], addItem: vi.fn() }),
}))

vi.mock('@/hooks/useWebSocket', () => ({
  useWebSocket: () => ({ status: 'connected', events: [] }),
}))

describe('Dashboard — mobile responsive layout', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('uses mobile-friendly outer spacing (space-y-6)', () => {
    const { container } = render(<Dashboard />)
    const outer = container.querySelector('.space-y-8')
    expect(outer).toBeNull()
  })

  it('renders heading with responsive text size classes', () => {
    render(<Dashboard />)
    const heading = screen.getByRole('heading', { level: 1, name: 'dashboard.title' })
    expect(heading.className).toContain('text-2xl')
    expect(heading.className).toContain('sm:text-3xl')
  })

  it('quick actions grid uses 2 columns on mobile, 5 on lg+', () => {
    const { container } = render(<Dashboard />)
    const quickGrid = container.querySelector('.grid.grid-cols-2')
    expect(quickGrid).toBeTruthy()
    expect(quickGrid?.className).toContain('sm:grid-cols-3')
    expect(quickGrid?.className).toContain('lg:grid-cols-5')
  })

  it('statistics grid uses single column on mobile, 4 on lg+', () => {
    const { container } = render(<Dashboard />)
    const statsGrid = container.querySelectorAll('.grid')
    const statGrid = Array.from(statsGrid).find(el => el.className.includes('sm:grid-cols-2') && el.className.includes('lg:grid-cols-4'))
    expect(statGrid).toBeTruthy()
  })
})