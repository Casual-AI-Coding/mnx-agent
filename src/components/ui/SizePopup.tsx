import { useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

export const IMAGE_SIZE_OPTIONS = [
  '1024x1024',
  '1536x1024',
  '1024x1536',
  '1280x2048',
  '2048x1280',
  '1536x2048',
  '2048x1152',
  '2048x1536',
  '1152x2048',
  '2048x2048',
  'auto',
] as const

const dropdownAnimation: React.CSSProperties = {
  animation: 'size-popup-slide-down 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
}

const styleTag = `
@keyframes size-popup-slide-down {
  from { opacity: 0; transform: translateY(-4px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
`

let styleInjected = false
function ensureStyle() {
  if (styleInjected) return
  styleInjected = true
  const el = document.createElement('style')
  el.textContent = styleTag
  document.head.appendChild(el)
}

interface SizePopupProps {
  open: boolean
  onClose: () => void
  value: string
  onChange: (value: string) => void
}

export function SizePopup({ open, onClose, value, onChange }: SizePopupProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => { ensureStyle() }, [])

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open, onClose])

  if (!open) return null

  return (
    <div ref={containerRef} className="absolute top-full left-0 z-50 mt-1 w-full">
      <div
        style={dropdownAnimation}
        className="rounded-lg bg-popover text-popover-foreground shadow-lg shadow-black/10 ring-1 ring-black/5 p-2"
      >
        <div className="grid grid-cols-3 gap-1.5">
          {IMAGE_SIZE_OPTIONS.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => {
                onChange(size)
                onClose()
              }}
              className={cn(
                'flex items-center justify-center px-2 py-1.5 rounded-md text-xs font-mono transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                value === size
                  ? 'bg-accent text-accent-foreground ring-1 ring-ring'
                  : 'text-foreground'
              )}
            >
              {size}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
