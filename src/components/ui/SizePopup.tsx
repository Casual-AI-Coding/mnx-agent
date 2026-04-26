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
  '2880x2880',
  '3264x2448',
  '2448x3264',
  '2880x2160',
  '2160x2880',
] as const

const dropdownAnimation: React.CSSProperties = {
  animation: 'size-popup-slide-right 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
}

const styleTag = `
@keyframes size-popup-slide-right {
  from { opacity: 0; transform: translateX(-6px) scale(0.97); }
  to   { opacity: 1; transform: translateX(0) scale(1); }
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
    <div ref={containerRef} className="absolute top-0 left-full z-50 ml-1 min-w-[340px]">
      <div
        style={dropdownAnimation}
        className="rounded-lg bg-popover text-popover-foreground shadow-lg shadow-black/10 ring-1 ring-black/5 p-3"
      >
        <div className="grid grid-cols-4 gap-2">
          {IMAGE_SIZE_OPTIONS.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => {
                onChange(size)
                onClose()
              }}
              className={cn(
                'flex items-center justify-center px-2.5 py-2 rounded-md text-xs font-mono transition-colors',
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
