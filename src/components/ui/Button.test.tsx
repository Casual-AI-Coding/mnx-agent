import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'

vi.mock('../../hooks/useBreakpoint', () => ({
  useIsMobile: vi.fn(),
}))

import { useIsMobile } from '../../hooks/useBreakpoint'

describe('Button Component', () => {
  it('renders with children', () => {
    vi.mocked(useIsMobile).mockReturnValue(false)
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeTruthy()
  })

  it('handles onClick', async () => {
    vi.mocked(useIsMobile).mockReturnValue(false)
    const user = userEvent.setup()
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)

    await user.click(screen.getByRole('button', { name: 'Click me' }))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('renders with different variants', () => {
    vi.mocked(useIsMobile).mockReturnValue(false)
    const { rerender } = render(<Button variant="destructive">Destructive</Button>)
    expect(screen.getByRole('button', { name: 'Destructive' })).toBeTruthy()

    rerender(<Button variant="outline">Outline</Button>)
    expect(screen.getByRole('button', { name: 'Outline' })).toBeTruthy()
  })

  it('applies 44px min touch target when touchable=true (desktop)', () => {
    vi.mocked(useIsMobile).mockReturnValue(false)
    render(<Button touchable>点击</Button>)
    const btn = screen.getByRole('button', { name: '点击' })
    expect(btn.className).toContain('min-h-[44px]')
    expect(btn.className).toContain('min-w-[44px]')
  })

  it('does not apply touch styles by default on desktop', () => {
    vi.mocked(useIsMobile).mockReturnValue(false)
    render(<Button>默认</Button>)
    const btn = screen.getByRole('button', { name: '默认' })
    expect(btn.className).not.toContain('min-h-[44px]')
    expect(btn.className).not.toContain('min-w-[44px]')
  })

  it('auto-enables 44px touch target on mobile for default size', () => {
    vi.mocked(useIsMobile).mockReturnValue(true)
    render(<Button>提交</Button>)
    const btn = screen.getByRole('button', { name: '提交' })
    expect(btn.className).toContain('min-h-[44px]')
    expect(btn.className).toContain('min-w-[44px]')
  })

  it('auto-enables 44px touch target on mobile for size=lg', () => {
    vi.mocked(useIsMobile).mockReturnValue(true)
    render(<Button size="lg">保存</Button>)
    const btn = screen.getByRole('button', { name: '保存' })
    expect(btn.className).toContain('min-h-[44px]')
  })

  it('does NOT auto-enable touch target on mobile for size=icon (preserves dense layouts)', () => {
    vi.mocked(useIsMobile).mockReturnValue(true)
    render(<Button size="icon" aria-label="icon-btn">★</Button>)
    const btn = screen.getByRole('button', { name: 'icon-btn' })
    expect(btn.className).not.toContain('min-h-[44px]')
    expect(btn.className).not.toContain('min-w-[44px]')
  })

  it('respects explicit touchable=false even on mobile', () => {
    vi.mocked(useIsMobile).mockReturnValue(true)
    render(<Button touchable={false}>固定按钮</Button>)
    const btn = screen.getByRole('button', { name: '固定按钮' })
    expect(btn.className).not.toContain('min-h-[44px]')
  })

  it('respects explicit touchable=true even on desktop', () => {
    vi.mocked(useIsMobile).mockReturnValue(false)
    render(<Button touchable>强制触控</Button>)
    const btn = screen.getByRole('button', { name: '强制触控' })
    expect(btn.className).toContain('min-h-[44px]')
  })
})
