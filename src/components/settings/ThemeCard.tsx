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
        'group relative w-full p-4 rounded-2xl border-2 transition-all duration-300',
        'flex flex-col items-start gap-3 overflow-hidden',
        selected
          ? 'border-primary-500 shadow-lg shadow-primary-500/20 scale-[1.02]'
          : 'border-transparent hover:border-white/10 hover:scale-[1.02] hover:shadow-xl'
      )}
      style={{ backgroundColor: `hsl(${theme.preview.background})` }}
    >
      <div 
        className={cn(
          'absolute inset-0 opacity-0 transition-opacity duration-300',
          selected ? 'opacity-100' : 'group-hover:opacity-100'
        )}
        style={{
          background: `linear-gradient(135deg, hsl(${theme.preview.primary}) 0%, transparent 60%)`,
          opacity: 0.15
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
            'w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300',
            selected 
              ? 'bg-white scale-100' 
              : 'bg-white/0 scale-75 opacity-0 group-hover:opacity-50'
          )}
        >
          <Check 
            className="w-4 h-4" 
            style={{ color: `hsl(${theme.preview.primary})` }}
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

      {selected && (
        <div 
          className="absolute bottom-0 left-0 right-0 h-1 bg-primary-500"
          style={{ backgroundColor: `hsl(${theme.preview.primary})` }}
        />
      )}
    </button>
  )
}