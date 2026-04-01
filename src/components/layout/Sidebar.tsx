import { useState } from 'react'
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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ShortcutsHelpButton } from '@/components/shared/ShortcutsHelp'
import { useAuthStore, type UserRole } from '@/stores/auth'

const roleHierarchy: Record<UserRole, number> = {
  user: 0,
  pro: 1,
  admin: 2,
  super: 3,
}

export default function Sidebar() {
  const { t } = useTranslation()
  const location = useLocation()
  const [isDebugExpanded, setIsDebugExpanded] = useState(true)
  const { user } = useAuthStore()

  const userRoleLevel = user ? roleHierarchy[user.role] : 0

  const debugItems = [
    { path: '/text', label: t('sidebar.textGeneration'), icon: MessageSquare },
    { path: '/voice', label: t('sidebar.voiceSync'), icon: Mic },
    { path: '/voice-async', label: t('sidebar.voiceAsync'), icon: MicOff },
    { path: '/image', label: t('sidebar.imageGeneration'), icon: Image },
    { path: '/music', label: t('sidebar.musicGeneration'), icon: Music },
    { path: '/video', label: t('sidebar.videoGeneration'), icon: Video },
    { path: '/video-agent', label: t('sidebar.videoAgent'), icon: VideoIcon },
  ]

  const independentItems = [
    { path: '/voice-mgmt', label: t('sidebar.voiceManagement'), icon: User, minRole: 'pro' as UserRole },
    { path: '/files', label: t('sidebar.fileManagement'), icon: FolderOpen, minRole: 'pro' as UserRole },
    { path: '/media', label: t('sidebar.mediaManagement'), icon: HardDrive, minRole: 'pro' as UserRole },
    { path: '/templates', label: t('sidebar.templates', '模板库'), icon: FileText, minRole: 'pro' as UserRole },
    { path: '/capacity', label: t('sidebar.capacityMonitor'), icon: Gauge, minRole: 'pro' as UserRole },
    { path: '/stats', label: t('sidebar.stats', '执行统计'), icon: BarChart3, minRole: 'pro' as UserRole },
    { path: '/audit', label: t('sidebar.audit', '审计日志'), icon: Shield, minRole: 'pro' as UserRole },
    { path: '/cron', label: t('sidebar.cronManagement'), icon: Clock, minRole: 'pro' as UserRole },
    { path: '/workflow-builder', label: t('sidebar.workflowBuilder'), icon: GitBranch, minRole: 'pro' as UserRole },
    { path: '/user-management', label: t('sidebar.userManagement', '用户管理'), icon: Users, minRole: 'super' as UserRole },
    { path: '/invitation-codes', label: t('sidebar.invitationCodes', '邀请码'), icon: Key, minRole: 'super' as UserRole },
  ]

  const visibleIndependentItems = independentItems.filter(
    item => userRoleLevel >= roleHierarchy[item.minRole]
  )

  const isInDebugSection = debugItems.some((item) =>
    location.pathname.startsWith(item.path)
  )

  return (
    <aside
      className="fixed left-0 top-[60px] bottom-0 w-[260px] bg-dark-950/50 backdrop-blur-xl border-r border-dark-800/50 overflow-y-auto"
    >
      <nav className="flex flex-col min-h-full pb-20">
        <div className="px-2 py-2">
          <button
            onClick={() => setIsDebugExpanded(!isDebugExpanded)}
            className="w-full flex items-center gap-3 px-3 py-2 text-dark-300 hover:text-white transition-colors"
          >
            <Terminal className="w-4 h-4" />
            <span className="text-sm font-medium flex-1 text-left">{t('sidebar.debugConsole')}</span>
            <ChevronRight
              className={cn(
                'w-4 h-4 transition-transform duration-200',
                isDebugExpanded && 'rotate-90'
              )}
            />
          </button>

          <div
            className={cn(
              'overflow-hidden transition-all duration-200',
              isDebugExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
            )}
          >
            <div className="pl-4 mt-1 space-y-0.5">
              {debugItems.map((item) => {
                const isActive = location.pathname === item.path
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 text-sm transition-all duration-200 border-l-2',
                      isActive
                        ? 'text-white bg-primary-600/20 border-l-2 border-primary-500'
                        : 'text-dark-400 hover:text-white hover:bg-white/5 border-transparent'
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </NavLink>
                )
              })}
            </div>
          </div>
        </div>

        <div className="px-2 py-2 border-t border-dark-800/30">
          {visibleIndependentItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 text-sm transition-all duration-200 border-l-2',
                  isActive
                    ? 'text-white bg-primary-600/20 border-l-2 border-primary-500'
                    : 'text-dark-400 hover:text-white hover:bg-white/5 border-transparent'
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            )
          })}
        </div>
      </nav>

      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-dark-800/50 bg-dark-950/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-dark-400">
            <div className="w-5 h-5 rounded bg-primary-600 flex items-center justify-center">
              <span className="text-white font-bold text-[10px]">M</span>
            </div>
            <span className="text-xs">{t('sidebar.createdBy')}</span>
            <ShortcutsHelpButton />
          </div>
        </div>
      </div>
    </aside>
  )
}
