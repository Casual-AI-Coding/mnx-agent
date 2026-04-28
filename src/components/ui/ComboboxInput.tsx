import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ComboboxOption {
  value: string
  label: string
  id?: string
}

interface ComboboxInputProps {
  value: string
  selectedId?: string
  onChange: (value: string, id?: string) => void
  options: ComboboxOption[]
  suffix?: string
  placeholder?: string
  disabled?: boolean
  inputClassName?: string
  className?: string
}

const dropdownAnimation: React.CSSProperties = {
  animation: 'combobox-slide-down 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
}

const styleTag = `
@keyframes combobox-slide-down {
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

export function ComboboxInput({
  value,
  selectedId,
  onChange,
  options,
  suffix,
  placeholder,
  disabled = false,
  inputClassName,
  className,
}: ComboboxInputProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => { ensureStyle() }, [])

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const handleSelect = useCallback((val: string, id?: string) => {
    onChange(val, id)
    setOpen(false)
  }, [onChange])

  const isOptionSelected = useCallback((o: ComboboxOption) => {
    if (selectedId && o.id) {
      return selectedId === o.id
    }
    return value === o.value
  }, [selectedId, value])

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <div
        className={cn(
          'flex items-center h-9 rounded-md border border-input bg-transparent transition-colors',
          'focus-within:ring-1 focus-within:ring-ring',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <div className="flex-1 flex items-center relative">
          <button
            type="button"
            onClick={() => !disabled && setOpen(!open)}
            disabled={disabled}
            className={cn(
              'flex items-center justify-center w-8 h-full shrink-0',
              'text-muted-foreground hover:text-foreground transition-colors',
              'hover:bg-muted/50',
              disabled && 'cursor-not-allowed'
            )}
          >
            <ChevronDown className={cn('w-3.5 h-3.5 transition-transform duration-200', open && 'rotate-180')} />
          </button>

          <div className="w-px h-4 bg-border shrink-0" />

          <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              'flex-1 h-full bg-transparent px-3 text-sm font-mono outline-none',
              'placeholder:text-muted-foreground',
              'disabled:cursor-not-allowed',
              inputClassName
            )}
          />

          {open && (
            <div
              style={dropdownAnimation}
              className="absolute top-full left-0 z-50 mt-1 w-full rounded-lg bg-popover text-popover-foreground shadow-lg shadow-black/10 overflow-hidden ring-1 ring-black/5"
            >
              {options.map(o => (
                <button
                  key={o.id ?? o.value}
                  type="button"
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left',
                    isOptionSelected(o) && 'bg-accent'
                  )}
                  onClick={() => handleSelect(o.value, o.id)}
                >
                  <span className="w-4 shrink-0">
                    {isOptionSelected(o) && <Check className="w-3.5 h-3.5" />}
                  </span>
                  <span className="font-mono text-xs">{o.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {suffix && (
          <>
            <div className="w-px h-4 bg-border shrink-0" />
            <span className="shrink-0 px-3 text-xs text-muted-foreground font-mono whitespace-nowrap select-none">
              {suffix}
            </span>
          </>
        )}
      </div>
    </div>
  )
}
