import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Input } from './Input'

describe('Input — mobile inputMode', () => {
  it('自动为 type=number 添加 inputMode=numeric', () => {
    render(<Input type="number" />)
    const input = screen.getByRole('spinbutton')
    expect(input.getAttribute('inputmode')).toBe('numeric')
  })

  it('保留调用方显式设置的 inputMode', () => {
    render(<Input type="number" inputMode="decimal" />)
    const input = screen.getByRole('spinbutton')
    expect(input.getAttribute('inputmode')).toBe('decimal')
  })

  it('非 number 类型不强制添加 inputMode', () => {
    render(<Input type="text" />)
    const input = screen.getByRole('textbox')
    expect(input.getAttribute('inputmode')).toBeNull()
  })

  it('email 类型保持默认行为', () => {
    render(<Input type="email" />)
    const input = screen.getByRole('textbox')
    expect(input.getAttribute('inputmode')).toBeNull()
  })
})