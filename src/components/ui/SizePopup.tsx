import { useRef, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export type SizeGroup = '1:1' | '3:2' | '2:3' | '4:3' | '3:4' | '16:9' | '9:16'

export interface SizeGroupConfig {
  key: SizeGroup
  label: string
}

export const SIZE_GROUPS: SizeGroupConfig[] = [
  { key: '1:1', label: '1:1' },
  { key: '4:3', label: '4:3' },
  { key: '3:4', label: '3:4' },
  { key: '16:9', label: '16:9' },
  { key: '3:2', label: '3:2' },
  { key: '2:3', label: '2:3' },
  { key: '9:16', label: '9:16' },
]

function gcd(a: number, b: number): number {
  let x = Math.abs(a)
  let y = Math.abs(b)
  while (y !== 0) {
    const temp = y
    y = x % y
    x = temp
  }
  return x
}

export function getSizeGroup(size: string): SizeGroup | null {
  const [width, height] = size.split('x').map(Number)
  const divisor = gcd(width, height)
  const ratio = `${width / divisor}:${height / divisor}`
  switch (ratio) {
    case '1:1':
    case '3:2':
    case '2:3':
    case '4:3':
    case '3:4':
    case '16:9':
    case '9:16':
      return ratio
    default:
      return null
  }
}

export const IMAGE_SIZE_OPTIONS = [
  '1024x1024',
  '1024x1536',
  '1536x1024',
  '2048x1536',
  '2048x1152',
  '2048x2048',
  '2880x2880',
  '3264x2448',
  '2448x3264',
  '2880x2160',
  '2160x2880',
  '2560x1440',
  '1440x2560',
] as const

export const GROUPED_SIZES: Record<SizeGroup, string[]> = {
  '1:1': [],
  '3:2': [],
  '2:3': [],
  '4:3': [],
  '3:4': [],
  '16:9': [],
  '9:16': [],
}

for (const size of IMAGE_SIZE_OPTIONS) {
  const group = getSizeGroup(size)
  if (group) {
    GROUPED_SIZES[group].push(size)
  }
}

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
  const [activeGroup, setActiveGroup] = useState<SizeGroup>(() => getSizeGroup(value) ?? '1:1')

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

  // 当外部value变化时，同步activeGroup
  useEffect(() => {
    if (open) {
      setActiveGroup(getSizeGroup(value) ?? '1:1')
    }
  }, [value, open])

  if (!open) return null

  const currentSizes = GROUPED_SIZES[activeGroup]

  return (
    <div ref={containerRef} className="absolute top-0 left-full z-50 ml-1 min-w-[340px]">
      <div
        style={dropdownAnimation}
        className="rounded-lg bg-popover text-popover-foreground shadow-lg shadow-black/10 ring-1 ring-black/5 p-3"
      >
        <div className="mb-3 flex flex-wrap gap-1 rounded-md bg-muted p-1">
          {SIZE_GROUPS.map((group) => (
            <button
              key={group.key}
              type="button"
              onClick={() => setActiveGroup(group.key)}
              className={cn(
                'inline-flex items-center justify-center rounded-full px-2 py-1 text-[11px] font-medium leading-none transition-colors',
                'hover:bg-background/80 hover:text-foreground',
                activeGroup === group.key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground'
              )}
            >
              {group.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {currentSizes.map((size) => {
            const [width, height] = size.split('x').map(Number)
            return (
              <button
                key={size}
                type="button"
                onClick={() => {
                  onChange(size)
                  onClose()
                }}
                className={cn(
                  'flex flex-col items-center justify-center px-2 py-2 rounded-md text-xs transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  value === size
                    ? 'bg-accent text-accent-foreground ring-1 ring-ring'
                    : 'text-foreground'
                )}
              >
                <span className="font-mono text-xs">{size}</span>
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  {width}×{height}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
