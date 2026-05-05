import { Cog, Github } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ShortcutsHelpButton } from '@/components/shared/ShortcutsHelp'

interface UserSectionProps {
  collapsed: boolean
  onOpenSettings: () => void
}

export function UserSection({ collapsed, onOpenSettings }: UserSectionProps) {
  const { t } = useTranslation()

  return (
    <div className={collapsed ? 'flex flex-col items-center gap-3' : 'flex items-center justify-between'}>
      {collapsed ? (
        <>
          <div className="w-7 h-7 rounded bg-primary-600 flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-[10px]">M</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <button onClick={onOpenSettings} className="text-muted-foreground hover:text-foreground transition-colors p-1" title="Settings">
              <Cog className="w-4 h-4" />
            </button>
            <ShortcutsHelpButton collapsed />
            <a href="https://github.com/oGsLP/mnx-agent" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors p-1" title="GitHub">
              <Github className="w-4 h-4" />
            </a>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-5 h-5 rounded bg-primary-600 flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-[10px]">M</span>
            </div>
            <span className="text-xs">{t('sidebar.createdBy', 'Created by oGsLP')}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onOpenSettings} className="text-muted-foreground hover:text-foreground transition-colors" title="Settings">
              <Cog className="w-4 h-4" />
            </button>
            <ShortcutsHelpButton />
            <a href="https://github.com/oGsLP/mnx-agent" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" title="GitHub">
              <Github className="w-4 h-4" />
            </a>
          </div>
        </>
      )}
    </div>
  )
}
