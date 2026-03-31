import * as React from 'react'
import { motion } from 'framer-motion'
import { Settings, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BaseNodeWrapperProps {
  children: React.ReactNode
  className?: string
  isSelected?: boolean
  borderColor?: string
  onDelete?: () => void
  onConfig?: () => void
  header?: React.ReactNode
  footer?: React.ReactNode
}

export const BaseNodeWrapper = React.forwardRef<HTMLDivElement, BaseNodeWrapperProps>(
  ({ children, className, isSelected, borderColor = 'border-dark-700', onDelete, onConfig, header, footer }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ scale: 1 }}
        animate={{
          scale: isSelected ? 1.02 : 1,
        }}
        whileHover={{
          scale: 1.01,
          transition: { duration: 0.15 },
        }}
        className={cn(
          'relative min-w-[200px] max-w-[320px]',
          'bg-dark-900/95 backdrop-blur-sm',
          'rounded-lg border-2',
          'shadow-lg shadow-black/20',
          'transition-all duration-200 ease-out',
          'cursor-pointer',
          borderColor,
          isSelected && 'ring-2 ring-primary/50 ring-offset-2 ring-offset-dark-950',
          className
        )}
      >
        {isSelected && (
          <motion.div
            layoutId="node-glow"
            className="absolute inset-0 rounded-lg bg-primary/5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}

        {(header || onDelete || onConfig) && (
          <div className="flex items-center justify-between px-3 py-2 border-b border-dark-700/50">
            {header && <div className="flex-1">{header}</div>}
            <div className="flex items-center gap-1">
              {onConfig && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onConfig()
                  }}
                  className={cn(
                    'p-1 rounded-md',
                    'text-dark-400 hover:text-primary',
                    'hover:bg-dark-800',
                    'transition-colors duration-150'
                  )}
                  title="Configure"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete()
                  }}
                  className={cn(
                    'p-1 rounded-md',
                    'text-dark-400 hover:text-destructive',
                    'hover:bg-destructive/10',
                    'transition-colors duration-150'
                  )}
                  title="Delete"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        <div className="px-3 py-3">{children}</div>

        {footer && <div className="px-3 py-2 border-t border-dark-700/50">{footer}</div>}
      </motion.div>
    )
  }
)
BaseNodeWrapper.displayName = 'BaseNodeWrapper'
