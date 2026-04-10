import * as React from 'react'
import { createPortal } from 'react-dom'
import { type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { ErrorBoundary, ErrorFallback } from '@/components/shared'
import { useSelectContext } from './SelectContext'
import { selectContentVariants } from './variants'

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
    const { open, selectId, listboxRef, highlightedIndex, itemIds, triggerRef } = useSelectContext()
    const innerRef = React.useRef<HTMLDivElement | null>(null)
    const listboxId = `${selectId}-listbox`
    const activeDescendantId = highlightedIndex >= 0 ? itemIds[highlightedIndex] : undefined
    const [position, setPosition] = React.useState({ top: 0, left: 0, width: 0 })

    React.useImperativeHandle(
      listboxRef,
      () => innerRef.current as HTMLDivElement,
      []
    )

    React.useEffect(() => {
      if (open && triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect()
        setPosition({
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
        })
      }
    }, [open, triggerRef])

    React.useEffect(() => {
      if (open && innerRef.current) {
        innerRef.current.focus()
      }
    }, [open])

    if (!open) return null

    return createPortal(
      <div
        ref={(node) => {
          innerRef.current = node
          // Also update the context's listboxRef directly
          if (listboxRef) {
            (listboxRef as React.MutableRefObject<HTMLDivElement | null>).current = node
          }
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
          'fixed z-50 max-h-60 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md',
          className
        )}
        style={{
          top: position.top + 4,
          left: position.left,
          minWidth: position.width,
        }}
        {...props}
      >
        <div className="p-1">{children}</div>
      </div>,
      document.body
    )
  }
)
SelectContentInner.displayName = 'SelectContentInner'
