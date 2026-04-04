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
  ChevronLeft,
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
  Layers,
  AlertTriangle,
  Webhook,
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
const COLLAPSED_KEY = 'sidebar-collapsed'

const MENU_ICONS = {
  shield: Shield,
  users: Users,
  key: Key,
  server: Shield,
  gitBranch: GitBranch,
}

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

function getStoredCollapsed(): boolean {
  try {
    const stored = localStorage.getItem(COLLAPSED_KEY)
    return stored ? JSON.parse(stored) : false
  } catch {
    return false
  }
}

function setStoredCollapsed(collapsed: boolean) {
  localStorage.setItem(COLLAPSED_KEY, JSON.stringify(collapsed))
}

interface SidebarProps {
  onCollapseChange?: (collapsed: boolean) => void
}

export default function Sidebar({ onCollapseChange }: SidebarProps) {
  const { t } = useTranslation()
  const location = useLocation()
  const { user } = useAuthStore()
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(getStoredExpanded)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(getStoredCollapsed)

  const userRoleLevel = user ? roleHierarchy[user.role] : 0

  useEffect(() => {
    setStoredExpanded(expandedSections)
  }, [expandedSections])

  useEffect(() => {
    setStoredCollapsed(isCollapsed)
    onCollapseChange?.(isCollapsed)
  }, [isCollapsed, onCollapseChange])

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
    if (isCollapsed) {
      setIsCollapsed(false)
    }
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }))
  }

  const toggleCollapse = () => {
    setIsCollapsed(prev => !prev)
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
        { path: '/workflow-builder', label: t('sidebar.workflowBuilder'), icon: GitBranch },
        { path: '/workflow-templates', label: t('sidebar.workflowTemplates', '流程管理'), icon: Layers },
        { path: '/cron', label: t('sidebar.cronManagement'), icon: Clock },
        { path: '/webhooks', label: 'Webhooks', icon: Webhook },
        { path: '/dead-letter-queue', label: t('sidebar.deadLetterQueue', '死信队列'), icon: AlertTriangle },
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
        { path: '/service-nodes', label: t('sidebar.serviceNodes', '节点权限'), icon: Shield },
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
    const Icon = item.icon

    if (isCollapsed) {
      return (
        <NavLink
          key={item.path}
          to={item.path}
          title={item.label}
          className={cn(
            'flex items-center justify-center py-3 transition-all duration-200 border-l-2',
            isActive
              ? 'text-foreground bg-primary-600/20 border-l-2 border-primary-500'
              : 'text-muted-foreground hover:text-foreground hover:bg-white/5 border-transparent'
          )}
        >
          <Icon className="w-5 h-5" />
        </NavLink>
      )
    }

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
        <Icon className="w-4 h-4" />
        {item.label}
      </NavLink>
    )
  }

  const renderSection = (section: typeof menuSections[0] & { items: typeof menuSections[0]['items'] }) => {
    const isExpanded = expandedSections[section.id]
    const SectionIcon = section.icon

    if (isCollapsed) {
      return (
        <div key={section.id} className="py-1 border-t border-border/30">
          {section.items.map(renderNavItem)}
        </div>
      )
    }

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
      className={cn(
        'fixed left-0 top-[60px] bottom-0 bg-card/50 backdrop-blur-xl border-r border-border/50 flex flex-col transition-all duration-200',
        isCollapsed ? 'w-[60px]' : 'w-[220px]'
      )}
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

      <button
        onClick={toggleCollapse}
        className={cn(
          'absolute -right-3 top-4 w-6 h-6 bg-card border border-border/50 rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-all duration-200 z-10 group',
          'hover:bg-primary-600 hover:border-primary-600'
        )}
        title={isCollapsed ? '展开侧边栏' : '收起侧边栏'}
      >
        {isCollapsed ? (
          <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-white transition-colors" />
        ) : (
          <ChevronLeft className="w-3 h-3 text-muted-foreground group-hover:text-white transition-colors" />
        )}
      </button>

      <nav className={cn(
        'flex-1 overflow-y-auto scrollbar-hide',
        isCollapsed ? 'px-1 py-2' : 'px-2 py-2'
      )}>
        {isCollapsed ? (
          <div className="py-1">
            {debugItems.map(renderNavItem)}
          </div>
        ) : (
          <>
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
          </>
        )}

        {visibleSections.map(renderSection)}
      </nav>

      <div className={cn(
        'flex-shrink-0 border-t border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-200',
        isCollapsed ? 'p-2' : 'p-4'
      )}>
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-7 h-7 rounded bg-primary-600 flex items-center justify-center">
              <span className="text-white font-bold text-[10px]">M</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => setShowSettingsModal(true)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
                title="Settings"
              >
                <Cog className="w-4 h-4" />
              </button>
              <ShortcutsHelpButton collapsed />
              <a
                href="https://github.com/oGsLP/mnx-agent"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
                title="GitHub"
              >
                <Github className="w-4 h-4" />
              </a>
            </div>
          </div>
        ) : (
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
        )}
      </div>

      <SettingsModal open={showSettingsModal} onClose={() => setShowSettingsModal(false)} />
    </aside>
  )
}
