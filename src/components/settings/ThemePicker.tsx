import { useState } from 'react'
import { useAppStore } from '@/stores/app'
import { getThemeById, getThemesByCategory } from '@/themes/registry'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { SystemOption } from './SystemOption'
import { ThemeCard } from './ThemeCard'
import type { ThemeCategory } from '@/themes/registry'
import { Monitor, Moon, Sun } from 'lucide-react'

type TabValue = 'system' | 'dark' | 'light'

const tabIcons = {
  system: Monitor,
  dark: Moon,
  light: Sun,
}

const tabLabels = {
  system: 'System',
  dark: 'Dark',
  light: 'Light',
}

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
    <div className="space-y-5">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
        <TabsList className="w-full grid grid-cols-3 bg-secondary/50 p-1 rounded-xl">
          {(['system', 'dark', 'light'] as TabValue[]).map((tab) => {
            const Icon = tabIcons[tab]
            const isActive = activeTab === tab
            return (
              <TabsTrigger 
                key={tab}
                value={tab} 
                className={`
                  flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg
                  transition-all duration-200
                  data-[state=active]:bg-primary-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-primary-500/25
                  data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground data-[state=inactive]:hover:bg-secondary/50
                `}
              >
                <Icon className={`w-4 h-4 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                <span className="font-medium">{tabLabels[tab]}</span>
              </TabsTrigger>
            )
          })}
        </TabsList>
      </Tabs>

      {activeTab === 'system' && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          <SystemOption
            selected={theme === 'system'}
            onSelect={() => setTheme('system')}
          />
        </div>
      )}

      {activeTab !== 'system' && (
        <div 
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-2 pl-2 max-h-[420px] overflow-y-auto
          animate-in fade-in slide-in-from-top-2 duration-300"
        >
          {themes.map((t, index) => (
            <div 
              key={t.id}
              className="animate-in fade-in zoom-in-95 duration-300"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <ThemeCard
                theme={t}
                selected={theme === t.id}
                onSelect={() => setTheme(t.id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}