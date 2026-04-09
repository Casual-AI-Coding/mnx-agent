import * as React from 'react'
import { type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { ErrorBoundary, ErrorFallback } from '@/components/shared'
import { useSelectContext } from './SelectContext'
import { selectItemVariants } from './variants'

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
      registerItem(itemId, value)
    }, [registerItem, itemId, value])

    const isHighlighted = itemIds[highlightedIndex] === itemId

    return (
      <div
        ref={ref}
        id={itemId}
        role="option"
        aria-selected={isHighlighted}
        data-value={value}
        data-disabled={disabled}
        data-highlighted={isHighlighted}
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
