import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ImageGallery from '../ImageGallery'
import TokenMonitor from '../TokenMonitor'
import StatsDashboard from '../StatsDashboard'

vi.mock('framer-motion', () => {
    const React = require('react')
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop: string) {
      return ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
        const { initial, animate, transition, whileHover, whileTap, exit, variants, layout, ...domProps } = props
        return React.createElement(prop, domProps, children)
      }
    },
  }
  return { motion: new Proxy({}, handler), AnimatePresence: ({ children }: React.PropsWithChildren) => children }
})

vi.mock('yet-another-react-lightbox', () => ({
  default: () => null,
}))

vi.mock('yet-another-react-lightbox/plugins/zoom', () => ({ default: () => null }))
vi.mock('yet-another-react-lightbox/plugins/download', () => ({ default: () => null }))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }),
}))

vi.mock('@/components/ui/Card', () => ({
  Card: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => <div className={className}>{children}</div>,
  CardHeader: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => <div className={className}>{children}</div>,
  CardTitle: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => <div className={className}>{children}</div>,
}))

vi.mock('@/components/ui/Badge', () => ({
  Badge: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => <span className={className}>{children}</span>,
}))

vi.mock('@/components/ui/Button', () => ({
  Button: ({ children, className, ...props }: React.PropsWithChildren<React.ButtonHTMLAttributes<HTMLButtonElement>>) => (
    <button className={className} {...props}>{children}</button>
  ),
}))

vi.mock('@/components/ui/Input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}))

vi.mock('@/components/ui/Skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => <div className={className} />,
}))

vi.mock('@/components/ui/Select', () => ({
  Select: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  SelectTrigger: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => <button className={className}>{children}</button>,
  SelectValue: () => <span>value</span>,
  SelectContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  SelectItem: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
}))

vi.mock('@/stores/history', () => ({
  useHistoryStore: () => ({ items: [], removeItem: vi.fn() }),
}))

vi.mock('@/stores/usage', () => ({
  useUsageStore: () => ({
    usage: {
      textTokens: 12,
      voiceCharacters: 24,
      imageRequests: 3,
      musicRequests: 4,
      videoRequests: 5,
      manualBalance: undefined,
    },
    history: [{ date: '2026-07-15', textTokens: 12, voiceCharacters: 24, imageRequests: 3, musicRequests: 4, videoRequests: 5 }],
    setManualBalance: vi.fn(),
    resetUsage: vi.fn(),
  }),
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ isHydrated: true }),
}))

vi.mock('@/lib/api/stats', () => ({
  getStatsOverview: vi.fn().mockResolvedValue({
    success: true,
    data: { totalExecutions: 12, successRate: 0.9, avgDuration: 1200, errorCount: 2 },
  }),
  getSuccessRateTrend: vi.fn().mockResolvedValue({
    success: true,
    data: [{ date: '2026-07-15', success: 9, total: 10 }],
  }),
  getTaskDistribution: vi.fn().mockResolvedValue({
    success: true,
    data: [{ type: 'text', count: 10 }],
  }),
  getErrorRanking: vi.fn().mockResolvedValue({
    success: true,
    data: [{ errorSummary: '连接超时导致任务失败', count: 4 }],
  }),
}))

describe('ImageGallery — mobile responsive layout', () => {
  it('stacks the gallery header on narrow screens', () => {
    const { container } = render(<ImageGallery />)

    const header = container.querySelector('.flex.flex-col.sm\\:flex-row')
    expect(header).toBeTruthy()
    expect(header?.className).toContain('gap-3')
  })
})

describe('TokenMonitor — mobile responsive layout', () => {
  it('stacks the balance editor before the desktop breakpoint', async () => {
    const user = userEvent.setup()
    render(<TokenMonitor />)

    await user.click(screen.getByRole('button', { name: /设置余额/ }))
    const balanceLabel = screen.getByText('余额:')
    const balanceEditor = balanceLabel.parentElement

    expect(balanceEditor?.className).toContain('flex-col')
    expect(balanceEditor?.className).toContain('sm:flex-row')
  })

  it('wraps the seven-day chart legend on narrow screens', () => {
    const { container } = render(<TokenMonitor />)

    const legend = container.querySelector('.border-t.text-sm')
    expect(legend?.className).toContain('flex-wrap')
  })
})

describe('StatsDashboard — mobile responsive layout', () => {
  it('wraps long error summaries above the count on narrow screens', async () => {
    const { container } = render(<StatsDashboard />)

    await waitFor(() => expect(screen.getByText('连接超时导致任务失败')).toBeTruthy())
    const summary = screen.getByText('连接超时导致任务失败')
    const row = summary.closest('div')?.parentElement

    expect(row?.className).toContain('flex-col')
    expect(row?.className).toContain('sm:flex-row')
    expect(container.querySelector('.grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-4')).toBeTruthy()
  })
})
