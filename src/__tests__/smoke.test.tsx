import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

const TestComponent = () => <div>Smoke Test Component</div>

describe('Smoke Tests', () => {
  it('renders a basic component', () => {
    render(<TestComponent />)
    expect(screen.getByText('Smoke Test Component')).toBeInTheDocument()
  })

  it('Testing Library globals are available', () => {
    render(<TestComponent />)
    const element = screen.getByText('Smoke Test Component')
    expect(element).toBeTruthy()
  })

  it('vitest globals are available', () => {
    expect(typeof describe).toBe('function')
    expect(typeof it).toBe('function')
    expect(typeof expect).toBe('function')
  })
})