import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { ErrorBoundary, ErrorFallback } from '@/components/shared'

// Select variants using CVA
const selectTriggerVariants = cva(
  'flex items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
  {
    variants: {
      size: {
        default: 'h-9 px-3 py-2',
        sm: 'h-8 px-3 py-2 text-xs',
        lg: 'h-10 px-4 py-2',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
)

// Select Context
interface SelectContextValue {
  value: string
  onValueChange: (value: string) => void
  open: boolean
  setOpen: (open: boolean) => void
  highlightedIndex: number
  setHighlightedIndex: (index: number) => void
  selectId: string
  itemIds: string[]
  registerItem: (id: string) => number
  unregisterItem: (id: string) => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
  listboxRef: React.RefObject<HTMLDivElement | null>
}

const SelectContext = React.createContext<SelectContextValue | undefined>(undefined)

function useSelectContext() {
  const context = React.useContext(SelectContext)
  if (!context) {
    throw new Error('Select components must be used within a Select provider')
  }
  return context
}

// Select Root Component
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
    // Return focus to trigger after selection
    triggerRef.current?.focus()
  }, [value, onValueChange])

  const registerItem = React.useCallback((id: string) => {
    setItemIds(prev => {
      if (prev.includes(id)) return prev
      return [...prev, id]
    })
    return itemIds.length
  }, [itemIds.length])

  const unregisterItem = React.useCallback((id: string) => {
    setItemIds(prev => prev.filter(itemId => itemId !== id))
  }, [])

  // Reset highlighted index when dropdown closes
  React.useEffect(() => {
    if (!open) {
      setHighlightedIndex(-1)
    }
  }, [open])

  // Handle keyboard navigation
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
        registerItem,
        unregisterItem,
        triggerRef,
        listboxRef
      }}
    >
      <div 
        className="relative inline-block"
        onKeyDown={handleKeyDown}
      >
        {children}
      </div>
    </SelectContext.Provider>
  )
}

// Select Trigger
export interface SelectTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof selectTriggerVariants> {}

export const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, size, children, ...props }, ref) => {
    return (
      <ErrorBoundary
        fallback={
          <ErrorFallback
            title="SelectTrigger 错误"
            message="SelectTrigger 必须在 Select 组件内使用"
            className="min-h-[36px]"
          />
        }
      >
        <SelectTriggerInner ref={ref} className={className} size={size} {...props}>
          {children}
        </SelectTriggerInner>
      </ErrorBoundary>
    )
  }
)
SelectTrigger.displayName = 'SelectTrigger'

const SelectTriggerInner = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, size, children, ...props }, forwardedRef) => {
    const { open, setOpen, selectId, triggerRef, itemIds, highlightedIndex } = useSelectContext()
    const innerRef = React.useRef<HTMLButtonElement | null>(null)
    
    const listboxId = `${selectId}-listbox`
    const activeDescendantId = highlightedIndex >= 0 ? itemIds[highlightedIndex] : undefined
    
    React.useImperativeHandle(
      triggerRef,
      () => innerRef.current as HTMLButtonElement,
      []
    )
    
    return (
      <button
        ref={(node) => {
          innerRef.current = node
          if (typeof forwardedRef === 'function') {
            forwardedRef(node)
          } else if (forwardedRef) {
            forwardedRef.current = node
          }
        }}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={activeDescendantId}
        className={cn(
          selectTriggerVariants({ size, className }),
          'w-full [&>span]:line-clamp-1'
        )}
        onClick={() => setOpen(!open)}
        {...props}
      >
        {children}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4 opacity-50 shrink-0"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
    )
  }
)
SelectTriggerInner.displayName = 'SelectTriggerInner'

// Select Value
export interface SelectValueProps extends React.HTMLAttributes<HTMLSpanElement> {
  placeholder?: string
}

export const SelectValue = React.forwardRef<HTMLSpanElement, SelectValueProps>(
  ({ className, placeholder, ...props }, ref) => {
    return (
      <ErrorBoundary
        fallback={
          <ErrorFallback
            title="SelectValue 错误"
            message="SelectValue 必须在 Select 组件内使用"
            className="min-h-[24px]"
          />
        }
      >
        <SelectValueInner ref={ref} className={className} placeholder={placeholder} {...props} />
      </ErrorBoundary>
    )
  }
)
SelectValue.displayName = 'SelectValue'

const SelectValueInner = React.forwardRef<HTMLSpanElement, SelectValueProps>(
  ({ className, placeholder, ...props }, ref) => {
    const { value } = useSelectContext()
    
    return (
      <span
        ref={ref}
        className={cn('pointer-events-none block truncate', className)}
        {...props}
      >
        {value || placeholder}
      </span>
    )
  }
)
SelectValueInner.displayName = 'SelectValueInner'

// Select Content
const selectContentVariants = cva(
  'relative z-50 max-h-60 min-w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md',
  {
    variants: {
      variant: {
        default: '',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface SelectContentProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof selectContentVariants> {}

export const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps>(
  ({ className, variant, children, ...props }, ref) => {
    return (
      <ErrorBoundary
        fallback={
          <ErrorFallback
            title="SelectContent 错误"
            message="SelectContent 必须在 Select 组件内使用"
            className="min-h-[36px]"
          />
        }
      >
        <SelectContentInner ref={ref} className={className} variant={variant} {...props}>
          {children}
        </SelectContentInner>
      </ErrorBoundary>
    )
  }
)
SelectContent.displayName = 'SelectContent'

const SelectContentInner = React.forwardRef<HTMLDivElement, SelectContentProps>(
  ({ className, variant, children, ...props }, forwardedRef) => {
    const { open, selectId, listboxRef, highlightedIndex, itemIds } = useSelectContext()
    const innerRef = React.useRef<HTMLDivElement | null>(null)
    const listboxId = `${selectId}-listbox`
    const activeDescendantId = highlightedIndex >= 0 ? itemIds[highlightedIndex] : undefined
    
    React.useImperativeHandle(
      listboxRef,
      () => innerRef.current as HTMLDivElement,
      []
    )
    
    if (!open) return null
    
    return (
      <div
        ref={(node) => {
          innerRef.current = node
          if (typeof forwardedRef === 'function') {
            forwardedRef(node)
          } else if (forwardedRef) {
            forwardedRef.current = node
          }
        }}
        id={listboxId}
        role="listbox"
        aria-activedescendant={activeDescendantId}
        tabIndex={0}
        className={cn(
          'absolute top-full left-0 mt-1',
          selectContentVariants({ variant, className })
        )}
        {...props}
      >
        <div className="p-1">{children}</div>
      </div>
    )
  }
)
SelectContentInner.displayName = 'SelectContentInner'

// Select Item
const selectItemVariants = cva(
  'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
  {
    variants: {
      variant: {
        default: '',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface SelectItemProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof selectItemVariants> {
  value: string
  disabled?: boolean
}

export const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className, variant, value, disabled, children, ...props }, ref) => {
    return (
      <ErrorBoundary
        fallback={
          <ErrorFallback
            title="SelectItem 错误"
            message="SelectItem 必须在 Select 组件内使用"
            className="min-h-[36px]"
          />
        }
      >
        <SelectItemInner ref={ref} className={className} variant={variant} value={value} disabled={disabled} {...props}>
          {children}
        </SelectItemInner>
      </ErrorBoundary>
    )
  }
)
SelectItem.displayName = 'SelectItem'

const SelectItemInner = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className, variant, value, disabled, children, ...props }, ref) => {
    const { value: selectedValue, onValueChange, highlightedIndex, itemIds, registerItem } = useSelectContext()
    const isSelected = selectedValue === value
    const itemId = React.useId()
    
    React.useEffect(() => {
      registerItem(itemId)
    }, [registerItem, itemId])
    
    const isHighlighted = itemIds[highlightedIndex] === itemId
    
    return (
      <div
        ref={ref}
        id={itemId}
        role="option"
        aria-selected={isHighlighted}
        data-value={value}
        data-disabled={disabled}
        className={cn(
          selectItemVariants({ variant }),
          isSelected && 'bg-accent',
          isHighlighted && 'bg-accent',
          className
        )}
        onClick={() => {
          if (!disabled) {
            onValueChange(value)
          }
        }}
        {...props}
      >
        {isSelected && (
          <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
        )}
        <span className="truncate">{children}</span>
      </div>
    )
  }
)
SelectItemInner.displayName = 'SelectItemInner'

// Select Group
export interface SelectGroupProps extends React.HTMLAttributes<HTMLDivElement> {}

export const SelectGroup = React.forwardRef<HTMLDivElement, SelectGroupProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('overflow-hidden p-1', className)}
        {...props}
      />
    )
  }
)
SelectGroup.displayName = 'SelectGroup'

// Select Label
export interface SelectLabelProps extends React.HTMLAttributes<HTMLDivElement> {}

export const SelectLabel = React.forwardRef<HTMLDivElement, SelectLabelProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('px-2 py-1.5 text-sm font-semibold', className)}
        {...props}
      />
    )
  }
)
SelectLabel.displayName = 'SelectLabel'

// Select Separator
export interface SelectSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {}

export const SelectSeparator = React.forwardRef<HTMLDivElement, SelectSeparatorProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('-mx-1 my-1 h-px bg-muted', className)}
        {...props}
      />
    )
  }
)
SelectSeparator.displayName = 'SelectSeparator'

export { selectTriggerVariants }
