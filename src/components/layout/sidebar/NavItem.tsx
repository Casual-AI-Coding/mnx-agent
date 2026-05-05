import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

export interface SidebarNavItem {
  icon: React.ComponentType<{ className?: string }>
  label: string
  path: string
}

interface NavItemProps {
  collapsed: boolean
  item: SidebarNavItem
}

export function NavItem({ collapsed, item }: NavItemProps) {
  const Icon = item.icon
  const baseClassName = ({ isActive }: { isActive: boolean }) =>
    cn(
      collapsed
        ? 'flex items-center justify-center py-3 transition-all duration-200 border-l-2'
        : 'flex items-center gap-3 px-3 py-2 text-sm transition-all duration-200 border-l-2',
      isActive
        ? 'text-foreground bg-primary-600/20 border-l-2 border-primary-500'
        : 'text-muted-foreground hover:text-foreground hover:bg-muted/20 border-transparent'
    )

  return (
    <NavLink key={item.path} to={item.path} title={collapsed ? item.label : undefined} className={baseClassName}>
      <Icon className={collapsed ? 'w-5 h-5' : 'w-4 h-4'} />
      {!collapsed && item.label}
    </NavLink>
  )
}
