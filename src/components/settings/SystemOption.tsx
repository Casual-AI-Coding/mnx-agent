import { cn } from '@/lib/utils'
import { Check, Monitor } from 'lucide-react'

interface SystemOptionProps {
  selected: boolean
  onSelect: () => void
}

export function SystemOption({ selected, onSelect }: SystemOptionProps) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'group w-full p-5 rounded-2xl border-2 transition-all duration-300',
        'flex items-center gap-4 relative',
        selected
          ? 'border-primary-500 bg-primary-500/5 shadow-lg shadow-primary-500/10'
          : 'border-border hover:border-primary-500/30 hover:bg-secondary/50'
      )}
    >
      <div 
        className={cn(
          'w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300',
          selected 
            ? 'bg-primary-500 shadow-lg shadow-primary-500/30' 
            : 'bg-secondary group-hover:bg-secondary/80'
        )}
      >
        <Monitor className={cn(
          'w-7 h-7 transition-all duration-300',
          selected ? 'text-white scale-110' : 'text-muted-foreground group-hover:text-foreground'
        )} />
      </div>

      <div className="flex-1 text-left">
        <span className="text-base font-semibold text-foreground block">
          Follow System Preference
        </span>
        <span className="text-sm text-muted-foreground block mt-1">
          Automatically match your device settings
        </span>
      </div>

      <div 
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300',
          selected 
            ? 'bg-primary-500 scale-100' 
            : 'bg-secondary scale-90'
        )}
      >
        <Check 
          className={cn(
            'w-5 h-5 transition-all duration-300',
            selected ? 'text-white scale-100' : 'text-muted-foreground/50 scale-75'
          )} 
        />
      </div>
    </button>
  )
}