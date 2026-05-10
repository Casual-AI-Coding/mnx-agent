import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import Dashboard from '../Dashboard'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
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
  return {
    motion: new Proxy({}, handler),
  }
})

vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
}))

vi.mock('@/components/onboarding/WelcomeModal', () => ({
  WelcomeModal: () => {
    throw new Error('welcome modal render failed')
  },
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
    usage: {
      textTokens: 1,
      imageRequests: 2,
      musicRequests: 3,
      videoRequests: 4,
    },
  }),
}))

vi.mock('@/stores/history', () => ({
  useHistoryStore: () => ({
    items: [],
    addItem: vi.fn(),
  }),
}))

vi.mock('@/hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    status: 'connected',
    events: [],
  }),
}))

describe('Dashboard', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('在欢迎弹窗渲染异常时显示错误边界兜底文案', () => {
    render(<Dashboard />)

    expect(screen.getByText('仪表盘加载失败')).toBeInTheDocument()
    expect(screen.getByText('仪表盘渲染时遇到错误，请稍后重试或刷新页面。')).toBeInTheDocument()
  })
})
