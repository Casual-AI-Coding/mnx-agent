import * as React from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { ErrorBoundary, ErrorFallback } from '@/components/shared'
import { useSelectContext } from './SelectContext'
import { selectContentVariants } from './variants'

const selectAnimationDown = {
  initial: { opacity: 0, scale: 0.95, y: -8 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: -8 },
  transition: { duration: 0.15, ease: [0.4, 0, 0.2, 1] }
}

const selectAnimationUp = {
  initial: { opacity: 0, scale: 0.95, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 8 },
  transition: { duration: 0.15, ease: [0.4, 0, 0.2, 1] }
}

export interface SelectContentProps
  extends VariantProps<typeof selectContentVariants> {
  className?: string
  children?: React.ReactNode
  side?: 'bottom' | 'top'
}

export const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps>(
  ({ className, variant, children, side = 'bottom' }, ref) => {
    const { open } = useSelectContext()
    
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
        <AnimatePresence>
          {open && (
            <SelectContentInner ref={ref} className={className} variant={variant} side={side}>
              {children}
            </SelectContentInner>
          )}
        </AnimatePresence>
      </ErrorBoundary>
    )
  }
)
SelectContent.displayName = 'SelectContent'

const SelectContentInner = React.forwardRef<HTMLDivElement, SelectContentProps>(
  ({ className, variant, children, side = 'bottom' }, forwardedRef) => {
    const { selectId, listboxRef, highlightedIndex, itemIds, triggerRef } = useSelectContext()
    const innerRef = React.useRef<HTMLDivElement | null>(null)
    const listboxId = `${selectId}-listbox`
    const activeDescendantId = highlightedIndex >= 0 ? itemIds[highlightedIndex] : undefined
    const [position, setPosition] = React.useState({ top: 0, bottom: 0, left: 0, width: 0, height: 0 })

    React.useImperativeHandle(
      listboxRef,
      () => innerRef.current as HTMLDivElement,
      []
    )

    React.useEffect(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect()
        setPosition({
          top: rect.bottom + window.scrollY,
          bottom: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height,
        })
      }
    }, [triggerRef])

    React.useEffect(() => {
      if (innerRef.current) {
        innerRef.current.focus()
      }
    }, [])

    const style = side === 'bottom'
      ? {
          top: position.top + 4,
          left: position.left,
          minWidth: position.width,
        }
      : {
          bottom: window.innerHeight - position.bottom + 4,
          left: position.left,
          minWidth: position.width,
        }

    return createPortal(
      <motion.div
        ref={(node) => {
          innerRef.current = node
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
          'fixed z-50 max-h-60 overflow-auto rounded-md bg-popover text-popover-foreground shadow-lg',
          className
        )}
        style={style}
        {...(side === 'bottom' ? selectAnimationDown : selectAnimationUp)}
      >
        <div className="p-1">{children}</div>
      </motion.div>,
      document.body
    )
  }
)
SelectContentInner.displayName = 'SelectContentInner'
