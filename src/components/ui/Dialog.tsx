import * as React from 'react'
import { createPortal } from 'react-dom'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

const dialogOverlayVariants = cva(
  'fixed inset-0 z-[80] bg-foreground/40 backdrop-blur-sm transition-opacity duration-300',
)

const dialogContentVariants = cva(
  'fixed left-[50%] top-[50%] z-[81] grid w-full translate-x-[-50%] translate-y-[-50%] gap-0 border-0 bg-background shadow-2xl sm:rounded-2xl overflow-hidden transition-all duration-300',
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
    const [shouldRender, setShouldRender] = React.useState(open)
    const [isAnimating, setIsAnimating] = React.useState(false)

    React.useEffect(() => {
      if (open) {
        setShouldRender(true)
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setIsAnimating(true))
        })
      } else if (shouldRender) {
        setIsAnimating(false)
        const timer = setTimeout(() => setShouldRender(false), 300)
        return () => clearTimeout(timer)
      }
    }, [open])

    if (!shouldRender) return null

    return createPortal(
      <div className="relative">
        <div
          className={cn(
            dialogOverlayVariants(),
            isAnimating ? 'opacity-100' : 'opacity-0'
          )}
          onClick={onClose}
        />
        <div
          ref={ref}
          className={cn(
            dialogContentVariants({ size, className }),
            isAnimating
              ? 'opacity-100 scale-100'
              : 'opacity-0 scale-90'
          )}
          onClick={(event) => event.stopPropagation()}
          {...props}
        >
          {title && (
            <div className={cn(
              "relative flex flex-col space-y-1.5",
              size === 'sm' ? "px-4 pt-4 pb-2" : "-mx-6 px-6 pt-6 pb-3 border-b border-border/30"
            )}>
              <div className="pr-8">
                <h2 className={cn(
                  "font-bold leading-none tracking-tight text-foreground",
                  size === 'sm' ? "text-base" : "text-xl"
                )}>{title}</h2>
                {description && (
                  <p className="text-sm text-muted-foreground mt-1">{description}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className={cn(
                  "absolute rounded-lg p-1.5 opacity-60 ring-offset-background transition-all duration-200 hover:opacity-100 hover:bg-destructive/10 hover:text-destructive focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none",
                  size === 'sm' ? "right-2 top-2" : "right-5 top-5"
                )}
              >
                <X className={cn("text-muted-foreground", size === 'sm' ? "h-3 w-3" : "h-4 w-4")} />
                <span className="sr-only">关闭</span>
              </button>
            </div>
          )}
          {!title && (
            <button
              onClick={onClose}
              className={cn(
                "absolute rounded-lg p-1.5 opacity-60 ring-offset-background transition-all duration-200 hover:opacity-100 hover:bg-destructive/10 hover:text-destructive focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none",
                size === 'sm' ? "right-2 top-2" : "right-5 top-5"
              )}
            >
              <X className={cn("text-muted-foreground", size === 'sm' ? "h-3 w-3" : "h-4 w-4")} />
              <span className="sr-only">关闭</span>
            </button>
          )}
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
