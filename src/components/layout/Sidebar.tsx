import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  MessageSquare,
  Mic,
  MicOff,
  Image,
  Music,
  Video,
  VideoIcon,
  User,
  FolderOpen,
  Terminal,
  ChevronRight,
  Clock,
  GitBranch,
  Gauge,
  HardDrive,
  FileText,
  BarChart3,
  Shield,
  Users,
  Key,
  FolderCog,
  Activity,
  Cog,
  Lock,
  Github,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ShortcutsHelpButton } from '@/components/shared/ShortcutsHelp'
import { useAuthStore, type UserRole } from '@/stores/auth'
import { SettingsModal } from '@/components/settings'

const roleHierarchy: Record<UserRole, number> = {
  user: 0,
  pro: 1,
  admin: 2,
  super: 3,
}

const EXPANDED_KEY = 'sidebar-expanded-sections'

function getStoredExpanded(): Record<string, boolean> {
  try {
    const stored = localStorage.getItem(EXPANDED_KEY)
    return stored ? JSON.parse(stored) : { debug: true }
  } catch {
    return { debug: true }
  }
}

function setStoredExpanded(expanded: Record<string, boolean>) {
  localStorage.setItem(EXPANDED_KEY, JSON.stringify(expanded))
}

export default function Sidebar() {
  const { t } = useTranslation()
  const location = useLocation()
  const { user } = useAuthStore()
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(getStoredExpanded)
  const [showSettingsModal, setShowSettingsModal] = useState(false)

  const userRoleLevel = user ? roleHierarchy[user.role] : 0

  useEffect(() => {
    setStoredExpanded(expandedSections)
  }, [expandedSections])

  useEffect(() => {
    if (!showSettingsModal) return

    document.body.style.overflow = 'hidden'

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowSettingsModal(false)
      }
    }
    window.addEventListener('keydown', handleEsc)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleEsc)
    }
  }, [showSettingsModal])

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }))
  }

  const debugItems = [
    { path: '/text', label: t('sidebar.textGeneration'), icon: MessageSquare },
    { path: '/voice', label: t('sidebar.voiceSync'), icon: Mic },
    { path: '/voice-async', label: t('sidebar.voiceAsync'), icon: MicOff },
    { path: '/image', label: t('sidebar.imageGeneration'), icon: Image },
    { path: '/music', label: t('sidebar.musicGeneration'), icon: Music },
    { path: '/video', label: t('sidebar.videoGeneration'), icon: Video },
    { path: '/video-agent', label: t('sidebar.videoAgent'), icon: VideoIcon },
  ]

  const menuSections = [
    {
      id: 'resources',
      label: '资源管理',
      icon: FolderCog,
      minRole: 'pro' as UserRole,
      items: [
        { path: '/voice-mgmt', label: t('sidebar.voiceManagement'), icon: User },
        { path: '/files', label: t('sidebar.fileManagement'), icon: FolderOpen },
        { path: '/media', label: t('sidebar.mediaManagement'), icon: HardDrive },
        { path: '/templates', label: t('sidebar.templates', '模板库'), icon: FileText },
      ],
    },
    {
      id: 'monitoring',
      label: '监控统计',
      icon: Activity,
      minRole: 'pro' as UserRole,
      items: [
        { path: '/capacity', label: t('sidebar.capacityMonitor'), icon: Gauge },
        { path: '/stats', label: t('sidebar.stats', '执行统计'), icon: BarChart3 },
        { path: '/audit', label: t('sidebar.audit', '审计日志'), icon: Shield },
      ],
    },
    {
      id: 'automation',
      label: '自动化',
      icon: Cog,
      minRole: 'pro' as UserRole,
      items: [
        { path: '/cron', label: t('sidebar.cronManagement'), icon: Clock },
        { path: '/workflow-builder', label: t('sidebar.workflowBuilder'), icon: GitBranch },
      ],
    },
    {
      id: 'system',
      label: '系统管理',
      icon: Lock,
      minRole: 'super' as UserRole,
      items: [
        { path: '/user-management', label: t('sidebar.userManagement', '用户管理'), icon: Users },
        { path: '/invitation-codes', label: t('sidebar.invitationCodes', '邀请码'), icon: Key },
      ],
    },
  ]

  const visibleSections = menuSections
    .filter(section => userRoleLevel >= roleHierarchy[section.minRole])
    .map(section => ({
      ...section,
      items: section.items,
    }))

  const renderNavItem = (item: { path: string; label: string; icon: React.ComponentType<{ className?: string }> }) => {
    const isActive = location.pathname === item.path
    return (
      <NavLink
        key={item.path}
        to={item.path}
        className={cn(
          'flex items-center gap-3 px-3 py-2 text-sm transition-all duration-200 border-l-2',
          isActive
            ? 'text-foreground bg-primary-600/20 border-l-2 border-primary-500'
            : 'text-muted-foreground hover:text-foreground hover:bg-white/5 border-transparent'
        )}
      >
        <item.icon className="w-4 h-4" />
        {item.label}
      </NavLink>
    )
  }

  const renderSection = (section: typeof menuSections[0] & { items: typeof menuSections[0]['items'] }) => {
    const isExpanded = expandedSections[section.id]
    const SectionIcon = section.icon

    return (
      <div key={section.id} className="py-2 border-t border-border/30">
        <button
          onClick={() => toggleSection(section.id)}
          className="w-full flex items-center gap-3 px-3 py-2 text-muted-foreground/70 hover:text-foreground transition-colors"
        >
          <SectionIcon className="w-4 h-4" />
          <span className="text-sm font-medium flex-1 text-left">{section.label}</span>
          <ChevronRight
            className={cn(
              'w-4 h-4 transition-transform duration-200',
              isExpanded && 'rotate-90'
            )}
          />
        </button>
        <div
          className={cn(
            'overflow-hidden transition-all duration-200',
            isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          <div className="pl-4 mt-1 space-y-0.5">
            {section.items.map(renderNavItem)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <aside
      className="fixed left-0 top-[60px] bottom-0 w-[260px] bg-card/50 backdrop-blur-xl border-r border-border/50 flex flex-col"
    >
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      <nav className="flex-1 overflow-y-auto scrollbar-hide px-2 py-2">
        <button
          onClick={() => toggleSection('debug')}
          className="w-full flex items-center gap-3 px-3 py-2 text-muted-foreground/70 hover:text-foreground transition-colors"
        >
          <Terminal className="w-4 h-4" />
          <span className="text-sm font-medium flex-1 text-left">{t('sidebar.debugConsole')}</span>
          <ChevronRight
            className={cn(
              'w-4 h-4 transition-transform duration-200',
              expandedSections['debug'] && 'rotate-90'
            )}
          />
        </button>

        <div
          className={cn(
            'overflow-hidden transition-all duration-200',
            expandedSections['debug'] ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          <div className="pl-4 mt-1 space-y-0.5">
            {debugItems.map(renderNavItem)}
          </div>
        </div>

        {visibleSections.map(renderSection)}
      </nav>

      <div className="flex-shrink-0 p-4 border-t border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-5 h-5 rounded bg-primary-600 flex items-center justify-center">
              <span className="text-white font-bold text-[10px]">M</span>
            </div>
            <span className="text-xs">{t('sidebar.createdBy')}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettingsModal(true)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Settings"
            >
              <Cog className="w-4 h-4" />
            </button>
            <ShortcutsHelpButton />
            <a
              href="https://github.com/oGsLP/mnx-agent"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="GitHub"
            >
              <Github className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      <SettingsModal open={showSettingsModal} onClose={() => setShowSettingsModal(false)} />
    </aside>
  )
}
