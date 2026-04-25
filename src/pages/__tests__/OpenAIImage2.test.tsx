import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import OpenAIImage2 from '../OpenAIImage2'

vi.mock('@/lib/api/external-api-logs', () => ({
  createExternalApiLog: vi.fn(),
  updateExternalApiLog: vi.fn(),
}))

vi.mock('@/lib/api/media', () => ({
  uploadMedia: vi.fn(),
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
    AnimatePresence: ({ children }: React.PropsWithChildren) => React.createElement(React.Fragment, null, children),
  }
})

describe('OpenAIImage2 Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should render without error', () => {
    const { container } = render(<OpenAIImage2 />)
    expect(container).toBeTruthy()
  })

  it('should unmount without error', () => {
    const { unmount } = render(<OpenAIImage2 />)
    expect(() => unmount()).not.toThrow()
  })

  it('should display the page header', () => {
    render(<OpenAIImage2 />)
    expect(screen.getByText('OpenAI Image-2')).toBeTruthy()
  })

  it('should display the prompt textarea', () => {
    render(<OpenAIImage2 />)
    const textarea = screen.getByPlaceholderText('描述你想生成的图像...')
    expect(textarea).toBeTruthy()
  })

  it('should display the base URL input', () => {
    render(<OpenAIImage2 />)
    const input = screen.getByPlaceholderText('https://mikuapi.org')
    expect(input).toBeTruthy()
  })

  it('should display the generate button', () => {
    render(<OpenAIImage2 />)
    expect(screen.getByText('生成图像')).toBeTruthy()
  })
})
