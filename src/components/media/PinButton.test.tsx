import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PinButton } from './PinButton'

describe('PinButton', () => {
  it('触发置顶回调 when 点击未置顶按钮 then 传入媒体 ID', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()

    render(<PinButton mediaId="media-1" onToggle={onToggle} />)

    await user.click(screen.getByRole('button', { name: '置顶' }))

    expect(onToggle).toHaveBeenCalledWith('media-1')
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('显示取消置顶状态 when 已置顶 then 图标使用填充样式', () => {
    render(<PinButton mediaId="media-1" isPinned={true} onToggle={vi.fn()} />)

    const button = screen.getByRole('button', { name: '取消置顶' })
    const icon = button.querySelector('svg')

    expect(button.classList.contains('text-primary')).toBe(true)
    expect(icon?.classList.contains('fill-current')).toBe(true)
  })

  it('阻止置顶回调 when 按钮禁用 then 不触发 onToggle', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()

    render(<PinButton mediaId="media-1" disabled={true} onToggle={onToggle} />)

    await user.click(screen.getByRole('button', { name: '置顶' }))

    expect(onToggle).not.toHaveBeenCalled()
  })
})
