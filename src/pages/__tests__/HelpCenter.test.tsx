import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import HelpCenter from '../HelpCenter'

describe('HelpCenter', () => {
  it('渲染 FAQ 分类与错误码速查表', () => {
    render(<MemoryRouter><HelpCenter /></MemoryRouter>)

    expect(screen.getByText('帮助中心')).toBeInTheDocument()
    expect(screen.getByText('快速上手')).toBeInTheDocument()
    expect(screen.getByTestId('error-codes')).toBeInTheDocument()
    expect(screen.getByTestId('error-entry-minimax-1027')).toBeInTheDocument()
    expect(screen.getByTestId('error-entry-internal-401')).toBeInTheDocument()
    expect(screen.getByTestId('error-entry-proxy-502')).toBeInTheDocument()
  })

  it('搜索同时过滤 FAQ 与错误码', () => {
    render(<MemoryRouter><HelpCenter /></MemoryRouter>)

    fireEvent.change(screen.getByLabelText('搜索帮助内容'), { target: { value: '死信队列' } })

    // FAQ 命中（任务与调度分类保留）
    expect(screen.getByText('任务为什么会进入死信队列？')).toBeInTheDocument()
    // 无关分类被过滤
    expect(screen.queryByText('快速上手')).toBeNull()

    fireEvent.change(screen.getByLabelText('搜索帮助内容'), { target: { value: '1027' } })
    expect(screen.getByTestId('error-entry-minimax-1027')).toBeInTheDocument()
    expect(screen.queryByTestId('error-entry-minimax-1004')).toBeNull()
  })

  it('无结果时展示占位', () => {
    render(<MemoryRouter><HelpCenter /></MemoryRouter>)

    fireEvent.change(screen.getByLabelText('搜索帮助内容'), { target: { value: '完全不存在的查询xyz' } })
    expect(screen.getByText(/没有匹配「完全不存在的查询xyz」的常见问题/)).toBeInTheDocument()
    expect(screen.getByText(/没有匹配「完全不存在的查询xyz」的错误码/)).toBeInTheDocument()
  })

  it('FAQ 点击展开答案', () => {
    render(<MemoryRouter><HelpCenter /></MemoryRouter>)

    const trigger = screen.getByText('如何配置 API Key？')
    expect(screen.queryByText(/粘贴你的 MiniMax API Key/)).toBeNull()
    fireEvent.click(trigger)
    expect(screen.getByText(/粘贴你的 MiniMax API Key/)).toBeInTheDocument()
  })
})
