import * as React from 'react'
import { cn } from '@/lib/utils'

export type TooltipSide = 'top' | 'right' | 'bottom' | 'left'

export interface TooltipProps {
  content: React.ReactNode
  side?: TooltipSide
  children: React.ReactNode
  className?: string
}

export function Tooltip({ content, side = 'top', children, className }: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false)

  const positionClasses: Record<TooltipSide, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  }

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className={cn(
            'absolute z-50 px-3 py-1.5 text-xs bg-dark-800 text-dark-200 border border-dark-700 rounded-md whitespace-nowrap animate-in fade-in-0 zoom-in-95',
            positionClasses[side],
            className
          )}
        >
          {content}
        </div>
      )}
    </div>
  )
}