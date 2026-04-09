import * as React from 'react'
import { SelectContext } from './SelectContext'

export interface SelectProps {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
}

export function Select({ value, defaultValue, onValueChange, children }: SelectProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue || '')
  const [open, setOpen] = React.useState(false)
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1)
  const [itemIds, setItemIds] = React.useState<string[]>([])
  const [itemValues, setItemValues] = React.useState<Map<string, string>>(new Map())
  const selectId = React.useId()
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const listboxRef = React.useRef<HTMLDivElement>(null)

  const currentValue = value ?? internalValue
  const handleValueChange = React.useCallback((newValue: string) => {
    if (value === undefined) {
      setInternalValue(newValue)
    }
    onValueChange?.(newValue)
    setOpen(false)
    setHighlightedIndex(-1)
    triggerRef.current?.focus()
  }, [value, onValueChange])

  const registerItem = React.useCallback((id: string, itemValue: string) => {
    setItemIds(prev => {
      if (prev.includes(id)) return prev
      return [...prev, id]
    })
    setItemValues(prev => {
      const next = new Map(prev)
      next.set(id, itemValue)
      return next
    })
    return itemIds.length
  }, [itemIds.length])

  const unregisterItem = React.useCallback((id: string) => {
    setItemIds(prev => prev.filter(itemId => itemId !== id))
    setItemValues(prev => {
      const next = new Map(prev)
      next.delete(id)
      return next
    })
  }, [])

  React.useEffect(() => {
    if (!open) {
      setHighlightedIndex(-1)
    }
  }, [open])

  React.useEffect(() => {
    if (open && currentValue) {
      const selectedIndex = itemIds.findIndex(id => itemValues.get(id) === currentValue)
      if (selectedIndex >= 0) {
        setHighlightedIndex(selectedIndex)
      }
    }
  }, [open, currentValue, itemIds, itemValues])

  React.useEffect(() => {
    if (!open) return

    function handleClickOutside(event: MouseEvent) {
      if (
        triggerRef.current && !triggerRef.current.contains(event.target as Node) &&
        listboxRef.current && !listboxRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        setOpen(true)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev => {
          const nextIndex = prev === -1 ? 0 : Math.min(prev + 1, itemIds.length - 1)
          return nextIndex
        })
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => {
          const nextIndex = prev === -1 ? itemIds.length - 1 : Math.max(prev - 1, 0)
          return nextIndex
        })
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < itemIds.length) {
          const item = document.getElementById(itemIds[highlightedIndex])
          if (item) {
            const value = item.getAttribute('data-value')
            if (value) {
              handleValueChange(value)
            }
          }
        }
        break
      case 'Escape':
        e.preventDefault()
        setOpen(false)
        triggerRef.current?.focus()
        break
      case 'Tab':
        setOpen(false)
        break
      case 'Home':
        e.preventDefault()
        setHighlightedIndex(0)
        break
      case 'End':
        e.preventDefault()
        setHighlightedIndex(itemIds.length - 1)
        break
    }
  }, [open, itemIds.length, highlightedIndex, handleValueChange])

  return (
    <SelectContext.Provider
      value={{
        value: currentValue,
        onValueChange: handleValueChange,
        open,
        setOpen,
        highlightedIndex,
        setHighlightedIndex,
        selectId,
        itemIds,
        itemValues,
        registerItem,
        unregisterItem,
        triggerRef,
        listboxRef
      }}
    >
      <div onKeyDown={handleKeyDown}>
        {children}
      </div>
    </SelectContext.Provider>
  )
}
