import * as React from 'react'

export interface SelectContextValue {
  value: string
  onValueChange: (value: string) => void
  open: boolean
  setOpen: (open: boolean) => void
  highlightedIndex: number
  setHighlightedIndex: (index: number) => void
  selectId: string
  itemIds: string[]
  itemValues: Map<string, string>
  registerItem: (id: string, value: string) => number
  unregisterItem: (id: string) => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
  listboxRef: React.RefObject<HTMLDivElement | null>
}

export const SelectContext = React.createContext<SelectContextValue | undefined>(undefined)

export function useSelectContext(): SelectContextValue {
  const context = React.useContext(SelectContext)
  if (!context) {
    throw new Error('Select components must be used within a Select provider')
  }
  return context
}
