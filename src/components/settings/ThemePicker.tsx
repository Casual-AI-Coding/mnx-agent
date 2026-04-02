import { useState } from 'react'
import { useAppStore } from '@/stores/app'
import { getThemeById, getThemesByCategory } from '@/themes/registry'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { SystemOption } from './SystemOption'
import { ThemeCard } from './ThemeCard'
import type { ThemeCategory } from '@/themes/registry'

type TabValue = 'system' | 'dark' | 'light'

export function ThemePicker() {
  const { theme, setTheme } = useAppStore()

  const getInitialTab = (): TabValue => {
    if (theme === 'system') return 'system'
    const themeMeta = getThemeById(theme)
    return themeMeta?.category ?? 'dark'
  }

  const [activeTab, setActiveTab] = useState<TabValue>(getInitialTab())

  const themes = activeTab === 'system'
    ? []
    : getThemesByCategory(activeTab as ThemeCategory)

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="system" className="flex-1">System</TabsTrigger>
          <TabsTrigger value="dark" className="flex-1">Dark</TabsTrigger>
          <TabsTrigger value="light" className="flex-1">Light</TabsTrigger>
        </TabsList>
      </Tabs>

      {activeTab === 'system' && (
        <SystemOption
          selected={theme === 'system'}
          onSelect={() => setTheme('system')}
        />
      )}

      {activeTab !== 'system' && (
        <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1">
          {themes.map((t) => (
            <ThemeCard
              key={t.id}
              theme={t}
              selected={theme === t.id}
              onSelect={() => setTheme(t.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}