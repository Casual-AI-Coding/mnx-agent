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
        'group relative w-full p-4 rounded-2xl transition-all duration-300',
        'flex flex-col items-start gap-3 overflow-hidden',
        selected
          ? 'ring-2 ring-primary-500 ring-offset-2 ring-offset-background shadow-lg scale-[1.02]'
          : 'ring-1 ring-border/50 hover:ring-primary-500/30 hover:scale-[1.02] hover:shadow-md'
      )}
      style={{ backgroundColor: `hsl(${theme.preview.background})` }}
    >
      <div 
        className={cn(
          'absolute inset-0 transition-opacity duration-300 pointer-events-none',
          selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        )}
        style={{
          background: `linear-gradient(135deg, hsl(${theme.preview.primary}) 0%, transparent 60%)`,
          opacity: selected ? 0.1 : 0.05
        }}
      />

      <div className="relative flex items-center justify-between w-full">
        <div
          className={cn(
            'w-10 h-10 rounded-full shadow-lg transition-all duration-300',
            selected ? 'scale-110 shadow-xl' : 'group-hover:scale-105'
          )}
          style={{ 
            backgroundColor: `hsl(${theme.preview.primary})`,
            boxShadow: `0 4px 20px -4px hsl(${theme.preview.primary} / 0.5)`
          }}
        />

        <div 
          className={cn(
            'w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 bg-primary-500',
            selected 
              ? 'scale-100 opacity-100' 
              : 'scale-75 opacity-0 group-hover:opacity-50'
          )}
        >
          <Check 
            className="w-4 h-4 text-white" 
          />
        </div>
      </div>

      <span
        className={cn(
          'relative text-sm font-semibold transition-all duration-200',
          selected && 'translate-y-0'
        )}
        style={{ color: `hsl(${textColor})` }}
      >
        {theme.name}
      </span>
    </button>
  )
}