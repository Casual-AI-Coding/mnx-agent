import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from './Select'

describe('Select Component', () => {
  it('renders with children', () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">Option 1</SelectItem>
          <SelectItem value="2">Option 2</SelectItem>
        </SelectContent>
      </Select>
    )
    expect(screen.getByText('Select an option')).toBeInTheDocument()
  })

  it('handles selection', async () => {
    const user = userEvent.setup()
    render(
      <Select defaultValue="1">
        <SelectTrigger>
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">Option 1</SelectItem>
          <SelectItem value="2">Option 2</SelectItem>
        </SelectContent>
      </Select>
    )
    
    await user.click(screen.getByRole('button'))
    expect(screen.getByText('Option 1')).toBeInTheDocument()
  })

  it('renders with different size variants', () => {
    const { rerender } = render(
      <Select>
        <SelectTrigger size="default">
          <SelectValue placeholder="Default" />
        </SelectTrigger>
      </Select>
    )
    expect(screen.getByRole('button', { name: 'Default' })).toBeInTheDocument()
    
    rerender(
      <Select>
        <SelectTrigger size="sm">
          <SelectValue placeholder="Small" />
        </SelectTrigger>
      </Select>
    )
    expect(screen.getByRole('button', { name: 'Small' })).toBeInTheDocument()
    
    rerender(
      <Select>
        <SelectTrigger size="lg">
          <SelectValue placeholder="Large" />
        </SelectTrigger>
      </Select>
    )
    expect(screen.getByRole('button', { name: 'Large' })).toBeInTheDocument()
  })
})

describe('Select Keyboard Navigation', () => {
  const renderSelect = (props: { defaultValue?: string; onValueChange?: (value: string) => void } = {}) => {
    return render(
      <Select defaultValue={props.defaultValue} onValueChange={props.onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">Option 1</SelectItem>
          <SelectItem value="2">Option 2</SelectItem>
          <SelectItem value="3">Option 3</SelectItem>
          <SelectItem value="4">Option 4</SelectItem>
        </SelectContent>
      </Select>
    )
  }

  describe('ArrowDown', () => {
    it('highlights first item when pressing ArrowDown from trigger', async () => {
      const user = userEvent.setup()
      renderSelect()

      const trigger = screen.getByRole('button')
      await user.click(trigger)
      await user.keyboard('{ArrowDown}')

      const highlightedOption = screen.getByRole('option', { selected: true })
      expect(highlightedOption).toHaveTextContent('Option 1')
    })

    it('moves highlight down through items', async () => {
      const user = userEvent.setup()
      renderSelect()

      const trigger = screen.getByRole('button')
      await user.click(trigger)
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{ArrowDown}')

      const highlightedOption = screen.getByRole('option', { selected: true })
      expect(highlightedOption).toHaveTextContent('Option 2')
    })

    it('stops at last item', async () => {
      const user = userEvent.setup()
      renderSelect()

      const trigger = screen.getByRole('button')
      await user.click(trigger)
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{ArrowDown}')

      const highlightedOption = screen.getByRole('option', { selected: true })
      expect(highlightedOption).toHaveTextContent('Option 4')
    })
  })

  describe('ArrowUp', () => {
    it('highlights last item when pressing ArrowUp from trigger', async () => {
      const user = userEvent.setup()
      renderSelect()

      const trigger = screen.getByRole('button')
      await user.click(trigger)
      await user.keyboard('{ArrowUp}')

      const highlightedOption = screen.getByRole('option', { selected: true })
      expect(highlightedOption).toHaveTextContent('Option 4')
    })

    it('moves highlight up through items', async () => {
      const user = userEvent.setup()
      renderSelect({ defaultValue: '4' })

      const trigger = screen.getByRole('button')
      await user.click(trigger)
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{ArrowUp}')

      const highlightedOption = screen.getByRole('option', { selected: true })
      expect(highlightedOption).toHaveTextContent('Option 3')
    })

    it('stops at first item', async () => {
      const user = userEvent.setup()
      renderSelect()

      const trigger = screen.getByRole('button')
      await user.click(trigger)
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{ArrowUp}')
      await user.keyboard('{ArrowUp}')

      const highlightedOption = screen.getByRole('option', { selected: true })
      expect(highlightedOption).toHaveTextContent('Option 1')
    })
  })

  describe('Enter', () => {
    it('selects highlighted item and closes dropdown', async () => {
      const user = userEvent.setup()
      const handleValueChange = vi.fn()
      renderSelect({ onValueChange: handleValueChange })

      const trigger = screen.getByRole('button')
      await user.click(trigger)
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(handleValueChange).toHaveBeenCalledWith('2')
      })
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })

    it('does nothing if no item is highlighted', async () => {
      const user = userEvent.setup()
      const handleValueChange = vi.fn()
      renderSelect({ onValueChange: handleValueChange })

      const trigger = screen.getByRole('button')
      await user.click(trigger)
      await user.keyboard('{Enter}')

      expect(handleValueChange).not.toHaveBeenCalled()
    })
  })

  describe('Escape', () => {
    it('closes dropdown without selecting', async () => {
      const user = userEvent.setup()
      const handleValueChange = vi.fn()
      renderSelect({ onValueChange: handleValueChange })

      const trigger = screen.getByRole('button')
      await user.click(trigger)
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{Escape}')

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
      })
      expect(handleValueChange).not.toHaveBeenCalled()
    })
  })

  describe('Tab', () => {
    it('closes dropdown and moves focus out', async () => {
      const user = userEvent.setup()
      renderSelect()

      const trigger = screen.getByRole('button')
      await user.click(trigger)
      await user.keyboard('{Tab}')

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
      })
    })
  })

  describe('Home', () => {
    it('jumps to first item', async () => {
      const user = userEvent.setup()
      renderSelect({ defaultValue: '4' })

      const trigger = screen.getByRole('button')
      await user.click(trigger)
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{Home}')

      const highlightedOption = screen.getByRole('option', { selected: true })
      expect(highlightedOption).toHaveTextContent('Option 1')
    })
  })

  describe('End', () => {
    it('jumps to last item', async () => {
      const user = userEvent.setup()
      renderSelect()

      const trigger = screen.getByRole('button')
      await user.click(trigger)
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{End}')

      const highlightedOption = screen.getByRole('option', { selected: true })
      expect(highlightedOption).toHaveTextContent('Option 4')
    })
  })

  describe('ARIA attributes', () => {
    it('has aria-expanded on trigger', async () => {
      const user = userEvent.setup()
      renderSelect()

      const trigger = screen.getByRole('button')
      expect(trigger).toHaveAttribute('aria-expanded', 'false')

      await user.click(trigger)
      expect(trigger).toHaveAttribute('aria-expanded', 'true')

      await user.keyboard('{Escape}')
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
    })

    it('has aria-controls linking to listbox', async () => {
      const user = userEvent.setup()
      renderSelect()

      const trigger = screen.getByRole('button')
      await user.click(trigger)

      const controlsId = trigger.getAttribute('aria-controls')
      expect(controlsId).toBeTruthy()
      expect(document.getElementById(controlsId!)).toHaveRole('listbox')
    })

    it('has aria-activedescendant on listbox pointing to highlighted item', async () => {
      const user = userEvent.setup()
      renderSelect()

      const trigger = screen.getByRole('button')
      await user.click(trigger)
      await user.keyboard('{ArrowDown}')

      const listbox = screen.getByRole('listbox')
      const activeDescendantId = listbox.getAttribute('aria-activedescendant')
      expect(activeDescendantId).toBeTruthy()

      const activeElement = document.getElementById(activeDescendantId!)
      expect(activeElement).toHaveAttribute('aria-selected', 'true')
    })

    it('items have proper role and aria-selected', async () => {
      const user = userEvent.setup()
      renderSelect({ defaultValue: '2' })

      const trigger = screen.getByRole('button')
      await user.click(trigger)

      const options = screen.getAllByRole('option')
      expect(options).toHaveLength(4)
      expect(options[0]).toHaveAttribute('aria-selected', 'false')
      expect(options[1]).toHaveAttribute('aria-selected', 'true')
      expect(options[2]).toHaveAttribute('aria-selected', 'false')
      expect(options[3]).toHaveAttribute('aria-selected', 'false')
    })
  })

  describe('Focus management', () => {
    it('focuses trigger on mount', () => {
      renderSelect()
      const trigger = screen.getByRole('button')
      expect(trigger).toHaveFocus()
    })

    it('maintains focus within dropdown when open', async () => {
      const user = userEvent.setup()
      renderSelect()

      const trigger = screen.getByRole('button')
      await user.click(trigger)

      const listbox = screen.getByRole('listbox')
      expect(listbox).toHaveFocus()
    })
  })
})
