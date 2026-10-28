import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Playground from '../Playground'
import { CodeSnippetGenerator } from '@/components/playground/CodeSnippetGenerator'
import { internalAxios } from '@/lib/api/client'
import { PLAYGROUND_ENDPOINTS } from '@/components/playground/endpoint-catalog'

vi.mock('@/lib/api/client', () => ({
  internalAxios: { request: vi.fn() },
}))

describe('Playground', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('渲染端点目录并默认选中第一个端点', () => {
    render(<MemoryRouter><Playground /></MemoryRouter>)

    for (const endpoint of PLAYGROUND_ENDPOINTS) {
      expect(screen.getByTestId(`endpoint-${endpoint.id}`)).toBeInTheDocument()
    }
  })

  it('GET 请求带查询参数发送并展示响应', async () => {
    vi.mocked(internalAxios.request).mockResolvedValue({
      status: 200,
      data: { success: true, data: { totalBalance: 42.5 } },
    })
    render(<MemoryRouter><Playground /></MemoryRouter>)

    // 切到成功率趋势（有 period 参数）
    fireEvent.click(screen.getByTestId('endpoint-success-rate'))
    fireEvent.click(screen.getByRole('button', { name: /发送请求/ }))

    await waitFor(() => {
      expect(screen.getByTestId('playground-response')).toBeInTheDocument()
    })
    expect(internalAxios.request).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'GET', url: '/api/stats/success-rate?period=day' })
    )
    expect(screen.getByText('200')).toBeInTheDocument()
    expect(screen.getByText(/totalBalance/)).toBeInTheDocument()
  })

  it('POST 请求体 JSON 非法时阻止发送并提示', async () => {
    render(<MemoryRouter><Playground /></MemoryRouter>)

    fireEvent.click(screen.getByTestId('endpoint-text-generation'))
    fireEvent.change(screen.getByLabelText('请求体'), { target: { value: '{invalid' } })
    fireEvent.click(screen.getByRole('button', { name: /发送请求/ }))

    expect(internalAxios.request).not.toHaveBeenCalled()
    await waitFor(() => {
      expect(screen.getByText(/JSON 解析失败|Expected property name|Unexpected token/)).toBeInTheDocument()
    })
  })

  it('请求失败展示错误状态与响应体', async () => {
    vi.mocked(internalAxios.request).mockRejectedValue({
      response: { status: 429, data: { success: false, error: '请求过于频繁' } },
    })
    render(<MemoryRouter><Playground /></MemoryRouter>)

    fireEvent.click(screen.getByRole('button', { name: /发送请求/ }))

    await waitFor(() => {
      expect(screen.getByText('429')).toBeInTheDocument()
    })
    expect(screen.getByText(/请求过于频繁/)).toBeInTheDocument()
  })
})

describe('CodeSnippetGenerator', () => {
  it('三种语言片段可切换且包含 URL 与鉴权头', () => {
    render(<MemoryRouter><CodeSnippetGenerator method="GET" path="/api/usage" /></MemoryRouter>)

    expect(screen.getByTestId('snippet-content').textContent).toContain('requests.get')
    expect(screen.getByTestId('snippet-content').textContent).toContain('/api/usage')

    fireEvent.click(screen.getByRole('tab', { name: 'JavaScript' }))
    expect(screen.getByTestId('snippet-content').textContent).toContain('fetch')

    fireEvent.click(screen.getByRole('tab', { name: 'cURL' }))
    expect(screen.getByTestId('snippet-content').textContent).toContain('curl -X GET')
  })

  it('POST 片段包含 JSON 请求体', () => {
    render(
      <MemoryRouter>
        <CodeSnippetGenerator method="POST" path="/api/text" body={'{"prompt":"hi"}'} />
      </MemoryRouter>
    )

    expect(screen.getByTestId('snippet-content').textContent).toContain('requests.post')
    expect(screen.getByTestId('snippet-content').textContent).toContain('prompt')
  })
})
