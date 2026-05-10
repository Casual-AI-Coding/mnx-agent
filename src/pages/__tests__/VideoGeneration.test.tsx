import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import VideoGeneration from '../VideoGeneration'

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

vi.mock('@/components/shared/PageHeader', () => ({
  PageHeader: () => {
    throw new Error('page header render failed')
  },
}))

vi.mock('@/components/shared/WorkbenchActions', () => ({
  WorkbenchActions: () => <div>actions</div>,
}))

vi.mock('@/components/ui/Button', () => ({
  Button: ({ children, className, ...props }: React.PropsWithChildren<React.ButtonHTMLAttributes<HTMLButtonElement>>) => <button className={className} {...props}>{children}</button>,
}))

vi.mock('@/components/ui/Textarea', () => ({
  Textarea: ({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea className={className} {...props} />,
}))

vi.mock('@/components/ui/Badge', () => ({
  Badge: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => <span className={className}>{children}</span>,
}))

vi.mock('@/components/ui/Select', () => ({
  Select: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  SelectTrigger: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => <div className={className}>{children}</div>,
  SelectValue: () => <span>value</span>,
  SelectContent: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => <div className={className}>{children}</div>,
  SelectItem: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => <div className={className}>{children}</div>,
}))

vi.mock('@/lib/api/video', () => ({
  createVideo: vi.fn(),
  getVideoStatus: vi.fn(),
}))

vi.mock('@/lib/api/media', () => ({
  uploadMediaFromUrl: vi.fn(),
}))

vi.mock('@/stores/history', () => ({
  useHistoryStore: () => ({
    addItem: vi.fn(),
  }),
}))

vi.mock('@/stores/usage', () => ({
  useUsageStore: () => ({
    addUsage: vi.fn(),
  }),
}))

vi.mock('@/settings/store', () => ({
  useSettingsStore: (selector: (state: { settings: { generation: { video: { model: string } } } }) => unknown) => selector({
    settings: {
      generation: {
        video: {
          model: 'video-01',
        },
      },
    },
  }),
}))

vi.mock('@/types', () => ({
  VIDEO_MODELS: [{ id: 'video-01', name: 'video-01', description: 'desc' }],
  CAMERA_COMMANDS: [{ id: 'static', name: '静态', description: 'desc' }],
  DEFAULT_MODELS: { video: 'video-01' },
}))

vi.mock('@/hooks/useFormPersistence', () => ({
  FORM_PERSISTENCE_KEYS: {
    VIDEO_GENERATION: 'video-generation',
  },
  useFormPersistence: <T,>({ defaultValue }: { defaultValue: T }) => {
    const React = require('react') as typeof import('react')
    return React.useState<T>(defaultValue)
  },
}))

describe('VideoGeneration', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('在页面头部渲染异常时显示错误边界兜底文案', () => {
    render(<VideoGeneration />)

    expect(screen.getByText('视频生成加载失败')).toBeInTheDocument()
    expect(screen.getByText('视频生成页面渲染时遇到错误，请稍后重试或刷新页面。')).toBeInTheDocument()
  })
})
