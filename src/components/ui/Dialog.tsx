import * as React from 'react'
import { createPortal } from 'react-dom'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

const dialogOverlayVariants = cva(
  'fixed inset-0 z-[80] bg-foreground/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
)

const dialogContentVariants = cva(
  'fixed left-[50%] top-[50%] z-[81] grid w-full translate-x-[-50%] translate-y-[-50%] gap-4 border border-border/50 bg-background shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-xl',
  {
    variants: {
      size: {
        default: 'max-w-lg p-6',
        sm: 'max-w-xs p-4',
        lg: 'max-w-2xl p-6',
        full: 'max-w-[90vw] p-6',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
)

export interface DialogProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof dialogContentVariants> {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
}

const Dialog = React.forwardRef<HTMLDivElement, DialogProps>(
  ({ className, size, open, onClose, title, description, children, ...props }, ref) => {
    const [isVisible, setIsVisible] = React.useState(open)
    const [animationState, setAnimationState] = React.useState<'open' | 'closed'>(open ? 'open' : 'closed')
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
      setMounted(true)
      return () => setMounted(false)
    }, [])

    React.useEffect(() => {
      if (open) {
        setIsVisible(true)
        setAnimationState('open')
      } else if (isVisible) {
        setAnimationState('closed')
        // Wait for animation to complete before hiding
        const timer = setTimeout(() => setIsVisible(false), 200)
        return () => clearTimeout(timer)
      }
    }, [open, isVisible])

    if (!mounted || !isVisible) return null

    return createPortal(
      <div className="relative">
        <div 
          className={dialogOverlayVariants()} 
          onClick={onClose}
          data-state={animationState}
        />
        <div
          ref={ref}
          className={cn(dialogContentVariants({ size, className }))}
          data-state={animationState}
          onClick={(event) => event.stopPropagation()}
          {...props}
        >
          {title && (
            <div className="flex flex-col space-y-1.5 pr-8">
              <h2 className={cn(
                "font-semibold leading-none tracking-tight text-foreground",
                size === 'sm' ? "text-base" : "text-xl"
              )}>{title}</h2>
              {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
            </div>
          )}
          <button
            onClick={onClose}
            className={cn(
              "absolute rounded-full p-1.5 opacity-60 ring-offset-background transition-all duration-150 hover:opacity-100 hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none",
              size === 'sm' ? "right-2 top-2" : "right-4 top-4"
            )}
          >
            <X className={cn("text-muted-foreground", size === 'sm' ? "h-3 w-3" : "h-4 w-4")} />
            <span className="sr-only">关闭</span>
          </button>
          {children}
        </div>
      </div>,
      document.body
    )
  }
)
Dialog.displayName = 'Dialog'

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col space-y-1.5 text-center sm:text-left',
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = 'DialogHeader'

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2',
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = 'DialogFooter'

export { Dialog, DialogHeader, DialogFooter }
