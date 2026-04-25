import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import OpenAIImage2 from '../OpenAIImage2'
import { createExternalApiLog, updateExternalApiLog, type ExternalApiLog } from '@/lib/api/external-api-logs'
import { uploadMedia } from '@/lib/api/media'

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

  it('should display the base URL select', () => {
    render(<OpenAIImage2 />)
    expect(screen.getByText('Base URL')).toBeTruthy()
  })

  it('should display the generate button', () => {
    render(<OpenAIImage2 />)
    expect(screen.getByText('生成图像')).toBeTruthy()
  })

  it('should display CORS error message on network failure', async () => {
    const mockCreate = vi.mocked(createExternalApiLog)
    const mockUpdate = vi.mocked(updateExternalApiLog)
    mockCreate.mockResolvedValue({ success: true, data: { id: 42 } as never })
    mockUpdate.mockResolvedValue({ success: false, error: 'fail' })

    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    fetchSpy.mockRejectedValue(new TypeError('Failed to fetch'))

    render(<OpenAIImage2 />)

    const promptInput = screen.getByPlaceholderText('描述你想生成的图像...')
    fireEvent.change(promptInput, { target: { value: 'test prompt' } })

    const tokenInput = screen.getByPlaceholderText('sk-...')
    fireEvent.change(tokenInput, { target: { value: 'sk-test-token' } })

    const generateButton = screen.getByText('生成图像')
    fireEvent.click(generateButton)

    await waitFor(() => {
      expect(screen.getByText(/CORS 跨域限制/)).toBeTruthy()
    })

    fetchSpy.mockRestore()
  })

  it('should display generate button disabled when prompt is empty', () => {
    render(<OpenAIImage2 />)
    const generateButton = screen.getByText('生成图像')
    expect(generateButton.closest('button')).toBeDisabled()
  })

  it('should enable generate button when prompt and token are filled', () => {
    render(<OpenAIImage2 />)

    const promptInput = screen.getByPlaceholderText('描述你想生成的图像...')
    fireEvent.change(promptInput, { target: { value: 'test prompt' } })

    const tokenInput = screen.getByPlaceholderText('sk-...')
    fireEvent.change(tokenInput, { target: { value: 'sk-test-token' } })

    const generateButton = screen.getByText('生成图像')
    expect(generateButton.closest('button')).not.toBeDisabled()
  })

  it('should call createExternalApiLog with request_body on generate', async () => {
    const mockCreate = vi.mocked(createExternalApiLog)
    mockCreate.mockResolvedValue({ success: true, data: { id: 1 } as never })

    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    fetchSpy.mockRejectedValue(new Error('stop'))

    render(<OpenAIImage2 />)

    const promptInput = screen.getByPlaceholderText('描述你想生成的图像...')
    fireEvent.change(promptInput, { target: { value: 'a cat' } })

    const tokenInput = screen.getByPlaceholderText('sk-...')
    fireEvent.change(tokenInput, { target: { value: 'sk-test' } })

    const generateButton = screen.getByText('生成图像')
    fireEvent.click(generateButton)

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalled()
      const callArgs = mockCreate.mock.calls[0][0]
      expect(callArgs.service_provider).toBe('openai')
      expect(callArgs.status).toBe('pending')
      expect(callArgs.request_body).toBeDefined()
      expect(callArgs.request_body).toContain('"prompt":"a cat"')
    })

    fetchSpy.mockRestore()
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

  it('should call uploadMedia with source external_debug', async () => {
    const mockCreate = vi.mocked(createExternalApiLog)
    const mockUpdate = vi.mocked(updateExternalApiLog)
    const mockUpload = vi.mocked(uploadMedia)

    mockCreate.mockResolvedValue({ success: true, data: { id: 1 } as never })
    mockUpdate.mockResolvedValue({ success: true, data: {} as never })
    mockUpload.mockResolvedValue({ success: true, data: { id: 'media-1' } as never })

    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const fakeBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    fetchSpy.mockResolvedValue({
      json: async () => ({
        success: true,
        data: {
          status: 200,
          body: {
            created: 123,
            data: [{ b64_json: fakeBase64 }],
            model: 'chatgpt-image-2',
            size: '1024x1024',
            usage: { total_tokens: 100 },
          },
        },
      }),
    } as Response)

    render(<OpenAIImage2 />)

    const promptInput = screen.getByPlaceholderText('描述你想生成的图像...')
    fireEvent.change(promptInput, { target: { value: 'a cat' } })

    const tokenInput = screen.getByPlaceholderText('sk-...')
    fireEvent.change(tokenInput, { target: { value: 'sk-test' } })

    const generateButton = screen.getByText('生成图像')
    fireEvent.click(generateButton)

    await waitFor(() => {
      expect(mockUpload).toHaveBeenCalled()
      const callArgs = mockUpload.mock.calls[0]
      expect(callArgs[3]).toBe('external_debug')
    })

    fetchSpy.mockRestore()
  })
})
