import { useRef, useEffect, ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface HeaderPopupProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  width?: string
}

export function HeaderPopup({ open, onClose, title, children, width = '480px' }: HeaderPopupProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      const isPortalContent = target instanceof Element &&
        (target.closest('[role="listbox"]') || target.closest('.bg-popover'))
      if (isPortalContent) return
      if (ref.current && !ref.current.contains(target)) {
        onClose()
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={ref}
      className={`absolute right-0 top-full mt-2 z-50 bg-card/80 backdrop-blur-md border border-border rounded-lg shadow-lg animate-in fade-in-0 zoom-in-95`}
      style={{ width }}
    >
      <div className="flex items-center justify-between p-3 border-b border-border">
        <span className="text-sm font-medium">{title}</span>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
          <X className="w-3 h-3" />
        </Button>
      </div>
      <div className="p-3">
        {children}
      </div>
    </div>
  )
}