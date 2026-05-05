import { Terminal, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NavItem, type SidebarNavItem } from './NavItem.js'

interface DebugSectionProps {
  collapsed: boolean
  expanded: boolean
  items: SidebarNavItem[]
  label: string
  onToggle: () => void
}

export function DebugSection({ collapsed, expanded, items, label, onToggle }: DebugSectionProps) {
  if (collapsed) {
    return (
      <div className="py-1">
        {items.map((item) => (
          <NavItem key={item.path} collapsed item={item} />
        ))}
      </div>
    )
  }

  return (
    <>
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-3 py-2 text-muted-foreground/70 hover:text-foreground transition-colors">
        <Terminal className="w-4 h-4" />
        <span className="text-sm font-medium flex-1 text-left">{label}</span>
        <ChevronRight className={cn('w-4 h-4 transition-transform duration-200', expanded && 'rotate-90')} />
      </button>

      <div className={cn('overflow-hidden transition-all duration-200', expanded ? 'max-h-[700px] opacity-100' : 'max-h-0 opacity-0')}>
        <div className="pl-4 mt-1 space-y-0.5">
          {items.map((item) => (
            <NavItem key={item.path} collapsed={false} item={item} />
          ))}
        </div>
      </div>
    </>
  )
}
