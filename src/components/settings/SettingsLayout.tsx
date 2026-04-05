import { ReactNode } from 'react'
import { SettingsSidebar } from './SettingsSidebar'
import { cn } from '@/lib/utils'

interface SettingsLayoutProps {
  children: ReactNode
  activeCategory: string
}

export function SettingsLayout({ children, activeCategory }: SettingsLayoutProps) {
  return (
    <div className={cn("flex h-[calc(100vh-4rem)]")}>
      <SettingsSidebar activeCategory={activeCategory} />
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  )
}
