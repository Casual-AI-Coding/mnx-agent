import * as React from 'react'
import { type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { ErrorBoundary, ErrorFallback } from '@/components/shared'
import { useSelectContext } from './SelectContext'
import { selectTriggerVariants } from './variants'

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
