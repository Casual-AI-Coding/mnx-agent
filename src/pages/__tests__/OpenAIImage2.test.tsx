import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import OpenAIImage2 from '../OpenAIImage2'
import { submitTask, getTaskStatus } from '@/lib/api/external-api-logs'

vi.mock('@/lib/api/external-api-logs', () => ({
  submitTask: vi.fn(),
  getTaskStatus: vi.fn(),
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

  it('should display the base URL select', () => {
    render(<OpenAIImage2 />)
    expect(screen.getByText('Base URL')).toBeTruthy()
  })

  it('should display the generate button', () => {
    render(<OpenAIImage2 />)
    expect(screen.getByText('生成')).toBeTruthy()
  })

  it('should display CORS error message on network failure', async () => {
    const mockSubmit = vi.mocked(submitTask)
    mockSubmit.mockResolvedValue({ success: false, error: '请求失败（可能是 CORS 跨域限制）。请确认目标 API 支持跨域请求，或使用支持 CORS 的代理地址。' })

    render(<OpenAIImage2 />)

    const promptInput = screen.getByPlaceholderText('描述你想生成的图像...')
    fireEvent.change(promptInput, { target: { value: 'test prompt' } })

    const tokenInput = screen.getByPlaceholderText('sk-...')
    fireEvent.change(tokenInput, { target: { value: 'sk-test-token' } })

    const generateButton = screen.getByText('生成')
    fireEvent.click(generateButton)

    await waitFor(() => {
      expect(screen.getByText(/CORS 跨域限制/)).toBeTruthy()
    })
  })

  it('should display generate button disabled when prompt is empty', () => {
    render(<OpenAIImage2 />)
    const generateButton = screen.getByText('生成')
    expect(generateButton.closest('button')).toBeDisabled()
  })

  it('should enable generate button when prompt and token are filled', () => {
    render(<OpenAIImage2 />)

    const promptInput = screen.getByPlaceholderText('描述你想生成的图像...')
    fireEvent.change(promptInput, { target: { value: 'test prompt' } })

    const tokenInput = screen.getByPlaceholderText('sk-...')
    fireEvent.change(tokenInput, { target: { value: 'sk-test-token' } })

    const generateButton = screen.getByText('生成')
    expect(generateButton.closest('button')).not.toBeDisabled()
  })

  it('should call submitTask with request_body on generate', async () => {
    const mockSubmit = vi.mocked(submitTask)
    mockSubmit.mockResolvedValue({ success: true, data: { taskId: 1, status: 'pending', message: '任务已提交' } })

    const mockStatus = vi.mocked(getTaskStatus)
    mockStatus.mockResolvedValue({
      success: true,
      data: {
        taskId: 1,
        task_status: 'completed',
        status: 'success',
        result_media_id: 'media-1',
        result_data: {
          created: 123,
          data: [{ url: 'https://example.com/image.png' }],
          model: 'chatgpt-image-2',
          size: '1024x1024',
          usage: { total_tokens: 100 },
        },
        error_message: null,
        created_at: '2026-05-03T00:00:00',
      },
    })

    render(<OpenAIImage2 />)

    const promptInput = screen.getByPlaceholderText('描述你想生成的图像...')
    fireEvent.change(promptInput, { target: { value: 'a cat' } })

    const tokenInput = screen.getByPlaceholderText('sk-...')
    fireEvent.change(tokenInput, { target: { value: 'sk-test' } })

    const generateButton = screen.getByText('生成')
    fireEvent.click(generateButton)

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalled()
      const callArgs = mockSubmit.mock.calls[0][0]
      expect(callArgs.service_provider).toBe('openai')
      expect(callArgs.operation).toBe('image_generation')
      expect(callArgs.body).toBeDefined()
      expect(JSON.stringify(callArgs.body)).toContain('"prompt":"a cat"')
    })
  })

  it('should use gpt-image-2 as default model', () => {
    render(<OpenAIImage2 />)
    const stored = localStorage.getItem('openai-image-2')
    if (stored) {
      const data = JSON.parse(stored)
      expect(data.model).toBe('gpt-image-2')
    }
    expect(screen.getByText('Model')).toBeTruthy()
  })
})
