import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'
import type { ThemeMeta } from '@/themes/registry'

interface ThemeCardProps {
  theme: ThemeMeta
  selected: boolean
  onSelect: () => void
}

export function ThemeCard({ theme, selected, onSelect }: ThemeCardProps) {
  const isDark = theme.category === 'dark'
  const textColor = isDark ? '210 40% 98%' : '220 20% 10%'

  return (
    <button
      onClick={onSelect}
      className={cn(
        'relative p-3 rounded-lg border transition-all cursor-pointer',
        'hover:scale-[1.02] active:scale-[0.98] duration-150',
        selected
          ? 'border-primary-500 ring-2 ring-primary-500/30'
          : 'border-dark-700 hover:border-dark-600'
      )}
      style={{ backgroundColor: `hsl(${theme.preview.background})` }}
    >
      <div
        className="w-8 h-8 rounded-full mb-2 shadow-sm"
        style={{ backgroundColor: `hsl(${theme.preview.primary})` }}
      />

      <span
        className="text-sm font-medium block"
        style={{ color: `hsl(${textColor})` }}
      >
        {theme.name}
      </span>

      {selected && (
        <div className="absolute top-2 right-2">
          <Check className="w-4 h-4" style={{ color: `hsl(${theme.preview.primary})` }} />
        </div>
      )}
    </button>
  )
}