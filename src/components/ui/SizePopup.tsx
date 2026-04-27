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

type TabGroup = '1:1' | '4:3' | '16:9' | '3:2'
type Orientation = 'landscape' | 'portrait'

interface TabConfig {
  key: TabGroup
  label: string
  landscape: SizeGroup
  portrait: SizeGroup
  paired: boolean
}

const TAB_CONFIGS: TabConfig[] = [
  { key: '1:1', label: '1:1', landscape: '1:1', portrait: '1:1', paired: false },
  { key: '4:3', label: '4:3 ⟷ 3:4', landscape: '4:3', portrait: '3:4', paired: true },
  { key: '16:9', label: '16:9 ⟷ 9:16', landscape: '16:9', portrait: '9:16', paired: true },
  { key: '3:2', label: '3:2 ⟷ 2:3', landscape: '3:2', portrait: '2:3', paired: true },
]

function getTabGroup(sizeGroup: SizeGroup): TabGroup {
  switch (sizeGroup) {
    case '1:1': return '1:1'
    case '4:3': case '3:4': return '4:3'
    case '16:9': case '9:16': return '16:9'
    case '3:2': case '2:3': return '3:2'
    default: return '1:1'
  }
}

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
  '1500x1500',
  '2048x2048',
  '2880x2880',
  '2048x1536',
  '2560x1920',
  '2880x2160',
  '3200x2400',
  '3264x2448',
  '1536x2048',
  '1920x2560',
  '2160x2880',
  '2400x3200',
  '2448x3264',
  '1920x1080',
  '2048x1152',
  '2560x1440',
  '3200x1800',
  '3840x2160',
  '1080x1920',
  '1152x2048',
  '1440x2560',
  '1800x3200',
  '2160x3840',
  '1536x1024',
  '2160x1440',
  '2880x1920',
  '1024x1536',
  '1440x2160',
  '1920x2880',
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

const popupAnimation: React.CSSProperties = {
  animation: 'size-popup-enter 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
}

const styleTag = `
@keyframes size-popup-enter {
  from { opacity: 0; transform: translateX(-8px) scale(0.96); }
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

function AspectPreview({ width, height, active }: { width: number; height: number; active: boolean }) {
  const maxW = 28
  const maxH = 20
  const scale = Math.min(maxW / width, maxH / height)
  const w = Math.round(width * scale)
  const h = Math.round(height * scale)
  return (
    <div className="flex items-center justify-center h-5 mb-1.5">
      <div
        className={cn(
          'rounded-sm transition-colors duration-150',
          active ? 'bg-foreground' : 'bg-muted-foreground/40'
        )}
        style={{ width: w, height: h }}
      />
    </div>
  )
}

const SwapIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="10"
    height="10"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 1l4 4-4 4" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <path d="M7 23l-4-4 4-4" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </svg>
)

export function SizePopup({ open, onClose, value, onChange }: SizePopupProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<TabGroup>(() => getTabGroup(getSizeGroup(value) ?? '1:1'))
  const [orientation, setOrientation] = useState<Orientation>(() => {
    const sg = getSizeGroup(value) ?? '1:1'
    const config = TAB_CONFIGS.find((t) => t.key === getTabGroup(sg))
    return sg === config?.portrait ? 'portrait' : 'landscape'
  })

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

  useEffect(() => {
    if (open) {
      const sg = getSizeGroup(value) ?? '1:1'
      const tab = getTabGroup(sg)
      const config = TAB_CONFIGS.find((t) => t.key === tab)
      setActiveTab(tab)
      setOrientation(sg === config?.portrait ? 'portrait' : 'landscape')
    }
  }, [value, open])

  if (!open) return null

  const currentConfig = TAB_CONFIGS.find((t) => t.key === activeTab) ?? TAB_CONFIGS[0]
  const currentSizeGroup = orientation === 'portrait' ? currentConfig.portrait : currentConfig.landscape
  const currentSizes = GROUPED_SIZES[currentSizeGroup]

  return (
    <div ref={containerRef} className="absolute top-0 left-full z-50 ml-2">
      <div
        style={popupAnimation}
        className="w-[420px] rounded-lg bg-popover text-popover-foreground shadow-lg shadow-black/10 ring-1 ring-black/5 p-2.5"
      >
        <div className="flex gap-0.5 mb-2.5 p-1 bg-muted rounded-lg">
          {TAB_CONFIGS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-1 flex-1 justify-center px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors',
                activeTab === tab.key
                  ? 'bg-background text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              )}
            >
              <span>{tab.paired ? (orientation === 'portrait' ? tab.portrait : tab.landscape) : tab.label}</span>
              {tab.paired && (
                <span
                  role="button"
                  tabIndex={-1}
                  title="切换方向"
                  onClick={(e) => {
                    e.stopPropagation()
                    setOrientation((prev) => (prev === 'landscape' ? 'portrait' : 'landscape'))
                  }}
                  className="inline-flex items-center justify-center rounded p-0.5 hover:bg-foreground/10 cursor-pointer"
                >
                  <SwapIcon />
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {currentSizes.map((size) => {
            const [width, height] = size.split('x').map(Number)
            const isSelected = value === size
            return (
              <button
                key={size}
                type="button"
                onClick={() => {
                  onChange(size)
                  onClose()
                }}
                className={cn(
                  'flex flex-col items-center px-3 py-2.5 rounded-md text-xs transition-colors cursor-pointer',
                  'hover:bg-accent hover:text-accent-foreground',
                  isSelected
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'text-foreground'
                )}
              >
                <AspectPreview width={width} height={height} active={isSelected} />
                <span className="font-mono text-[11px] leading-tight">{size}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
