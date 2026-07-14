import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MediaUploader } from '../MediaManagement/MediaUploader'

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

vi.mock('@/components/shared/PageHeader', () => ({
  PageHeader: ({ actions, title }: { actions?: React.ReactNode; title: string }) => (
    <div>
      <h1>{title}</h1>
      <div data-testid="actions-wrapper">{actions}</div>
    </div>
  ),
}))

vi.mock('@/components/ui/Button', () => ({
  Button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <button {...props}>{children}</button>
  ),
}))

vi.mock('@/components/ui/Card', () => ({
  Card: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  CardHeader: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => <div className={className}>{children}</div>,
  CardContent: () => null,
}))

vi.mock('@/components/ui/Input', () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}))

vi.mock('@/components/ui/Tabs', () => ({
  Tabs: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  TabsList: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  TabsTrigger: ({ children, value }: React.PropsWithChildren<{ value: string }>) => <button data-value={value}>{children}</button>,
}))

vi.mock('@/components/ui/Dialog', () => ({
  Dialog: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
}))

const defaultProps = {
  mediaTabs: [{ value: 'all', label: '全部', icon: null }],
  viewMode: 'table' as const,
  onViewModeChange: vi.fn(),
  onRefresh: vi.fn(),
  isRefreshing: false,
  onFetchRecoverable: vi.fn(),
  isLoadingRecoverable: false,
  activeTab: 'all',
  onTabChange: vi.fn(),
  favoriteFilters: new Set<string>(),
  publicFilters: new Set<string>(),
  onToggleFavoriteFilter: vi.fn(),
  onTogglePublicFilter: vi.fn(),
  searchQuery: '',
  onSearchQueryChange: vi.fn(),
  onSearch: vi.fn(),
  isSearching: false,
  recoverDialogOpen: false,
  onCloseRecoverDialog: vi.fn(),
  recoverableRecords: [],
  onRecover: vi.fn(),
  recoveringId: null,
}

describe('MediaUploader — mobile responsive layout', () => {
  it('hides 刷新/恢复上传 text labels on mobile (icon-only via hidden sm:inline)', () => {
    render(<MediaUploader {...defaultProps} />)
    const refreshLabel = screen.getByText('刷新')
    const recoverLabel = screen.getByText('恢复上传')
    expect(refreshLabel.className).toContain('hidden')
    expect(refreshLabel.className).toContain('sm:inline')
    expect(recoverLabel.className).toContain('hidden')
    expect(recoverLabel.className).toContain('sm:inline')
  })

  it('hides favorite/public filter text labels on mobile (icons only)', () => {
    render(<MediaUploader {...defaultProps} />)
    const labels = ['已收藏', '未收藏', '私有', '公开', '他人']
    labels.forEach((text) => {
      const el = screen.getByText(text)
      expect(el.className).toContain('hidden')
      expect(el.className).toContain('sm:inline')
    })
  })

  it('wraps filter row on small screens (flex-wrap on outer container)', () => {
    const { container } = render(<MediaUploader {...defaultProps} />)
    const filterRow = container.querySelector('.flex.flex-wrap.items-center.gap-2')
    expect(filterRow).toBeTruthy()
  })

  it('uses column layout for search row on mobile (flex-col sm:flex-row)', () => {
    const { container } = render(<MediaUploader {...defaultProps} />)
    const searchRow = container.querySelector('.flex.flex-col.sm\\:flex-row')
    expect(searchRow).toBeTruthy()
  })
})