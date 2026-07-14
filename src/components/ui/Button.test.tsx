import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'

describe('Button Component', () => {
  it('renders with children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('handles onClick', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    
    await user.click(screen.getByRole('button', { name: 'Click me' }))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('renders with different variants', () => {
    const { rerender } = render(<Button variant="destructive">Destructive</Button>)
    expect(screen.getByRole('button', { name: 'Destructive' })).toBeInTheDocument()

    rerender(<Button variant="outline">Outline</Button>)
    expect(screen.getByRole('button', { name: 'Outline' })).toBeInTheDocument()
  })

  it('applies 44px min touch target when touchable=true', () => {
    render(<Button touchable>点击</Button>)
    const btn = screen.getByRole('button', { name: '点击' })
    expect(btn.className).toContain('min-h-[44px]')
    expect(btn.className).toContain('min-w-[44px]')
  })

  it('does not apply touch styles by default', () => {
    render(<Button>默认</Button>)
    const btn = screen.getByRole('button', { name: '默认' })
    expect(btn.className).not.toContain('min-h-[44px]')
    expect(btn.className).not.toContain('min-w-[44px]')
  })
})