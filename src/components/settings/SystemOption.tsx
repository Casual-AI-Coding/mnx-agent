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
        'flex items-center gap-4 relative overflow-hidden',
        selected
          ? 'border-primary-500 bg-gradient-to-br from-primary-500/10 to-primary-600/5 shadow-lg shadow-primary-500/10'
          : 'border-dark-700 hover:border-dark-500 hover:bg-white/5'
      )}
    >
      <div 
        className={cn(
          'relative w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300',
          selected 
            ? 'bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg shadow-primary-500/30' 
            : 'bg-dark-800 group-hover:bg-dark-700'
        )}
      >
        <Monitor className={cn(
          'w-7 h-7 transition-all duration-300',
          selected ? 'text-white scale-110' : 'text-dark-400 group-hover:text-dark-300'
        )} />
        
        {selected && (
          <div className="absolute inset-0 rounded-xl animate-pulse bg-primary-400/20" />
        )}
      </div>

      <div className="flex-1 text-left">
        <span className={cn(
          'text-base font-semibold block transition-colors duration-200',
          selected ? 'text-white' : 'text-foreground'
        )}>
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
            : 'bg-dark-800 scale-90 opacity-50'
        )}
      >
        <Check 
          className={cn(
            'w-5 h-5 transition-all duration-300',
            selected ? 'text-white scale-100' : 'text-dark-500 scale-75'
          )} 
        />
      </div>
    </button>
  )
}