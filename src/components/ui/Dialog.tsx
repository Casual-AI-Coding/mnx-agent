import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

const dialogOverlayVariants = cva(
  'fixed inset-0 z-50 bg-foreground/10 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
)

const dialogContentVariants = cva(
  'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-dark-700 bg-dark-900 p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg',
  {
    variants: {
      size: {
        default: 'max-w-lg',
        sm: 'max-w-sm',
        lg: 'max-w-2xl',
        full: 'max-w-[90vw]',
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
    if (!open) return null

    return (
      <div className="relative">
        <div 
          className={dialogOverlayVariants()} 
          onClick={onClose}
          data-state={open ? 'open' : 'closed'}
        />
        <div
          ref={ref}
          className={cn(dialogContentVariants({ size, className }))}
          data-state={open ? 'open' : 'closed'}
          {...props}
        >
          {title && (
            <div className="flex flex-col space-y-1.5 text-center sm:text-left">
              <h2 className="text-lg font-semibold leading-none tracking-tight text-foreground">{title}</h2>
              {description && (
                <p className="text-sm text-dark-400">{description}</p>
              )}
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          >
            <X className="h-4 w-4 text-dark-400" />
            <span className="sr-only">Close</span>
          </button>
          {children}
        </div>
      </div>
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