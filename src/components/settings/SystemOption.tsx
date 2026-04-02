import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

interface SystemOptionProps {
  selected: boolean
  onSelect: () => void
}

export function SystemOption({ selected, onSelect }: SystemOptionProps) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full p-4 rounded-lg border transition-all cursor-pointer',
        'flex items-center gap-3',
        selected
          ? 'border-primary-500 bg-primary-500/10 ring-2 ring-primary-500/20'
          : 'border-dark-700 hover:border-dark-600 bg-dark-900/50'
      )}
    >
      <div className="w-10 h-10 rounded-full bg-dark-800 flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-dark-600 relative overflow-hidden">
          <div className="absolute left-0 top-0 w-1/2 h-full bg-dark-800" />
          <div className="absolute right-0 top-0 w-1/2 h-full bg-dark-300" />
        </div>
      </div>

      <div className="flex-1 text-left">
        <span className="text-sm font-medium text-foreground">
          Follow system preference
        </span>
        <span className="text-xs text-muted-foreground block mt-1">
          Automatically switch between dark and light themes
        </span>
      </div>

      {selected && <Check className="w-5 h-5 text-primary-500" />}
    </button>
  )
}