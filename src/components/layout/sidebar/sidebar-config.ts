import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock,
  Coins,
  FileText,
  Film,
  FolderCog,
  FolderOpen,
  Gauge,
  GitBranch,
  Globe,
  HardDrive,
  Image,
  Key,
  Layers,
  Lock,
  MessageSquare,
  Mic,
  MicOff,
  Music,
  Server,
  Shield,
  Store,
  User,
  Users,
  Video,
  Webhook,
} from 'lucide-react'
import type { TFunction } from 'i18next'
import type { UserRole } from '@/stores/auth'
import type { SidebarNavItem } from './NavItem.js'

export const roleHierarchy: Record<UserRole, number> = {
  user: 0,
  pro: 1,
  admin: 2,
  super: 3,
}

export interface SidebarSection {
  icon: React.ComponentType<{ className?: string }>
  id: string
  items: SidebarNavItem[]
  label: string
  minRole: UserRole
}

export function getDebugItems(t: TFunction): SidebarNavItem[] {
  return [
    { path: '/text', label: t('sidebar.textGeneration', '文本生成'), icon: MessageSquare },
    { path: '/voice', label: t('sidebar.voiceSync', '同步语音'), icon: Mic },
    { path: '/voice-async', label: t('sidebar.voiceAsync', '异步语音'), icon: MicOff },
    { path: '/image', label: t('sidebar.imageGeneration', '图片生成'), icon: Image },
    { path: '/music', label: t('sidebar.musicGeneration', '音乐生成'), icon: Music },
    { path: '/lyrics', label: t('sidebar.lyricsGeneration', '歌词生成'), icon: FileText },
    { path: '/video', label: t('sidebar.videoGeneration', '视频生成'), icon: Video },
    { path: '/video-agent', label: t('sidebar.videoAgent', '视频Agent'), icon: Film },
  ]
}

export function getMenuSections(t: TFunction): SidebarSection[] {
  return [
    {
      id: 'externalDebug',
      label: '外部调试',
      icon: Globe,
      minRole: 'admin',
      items: [{ path: '/external-debug/openai-image-2', label: 'OpenAI Image-2', icon: Image }],
    },
    {
      id: 'resources',
      label: '资源管理',
      icon: FolderCog,
      minRole: 'pro',
      items: [
        { path: '/voice-mgmt', label: t('sidebar.voiceManagement', '音色管理'), icon: User },
        { path: '/files', label: t('sidebar.fileManagement', '文件管理'), icon: FolderOpen },
        { path: '/media', label: t('sidebar.mediaManagement', '媒体管理'), icon: HardDrive },
        { path: '/templates', label: t('sidebar.templates', '模板库'), icon: FileText },
        { path: '/materials', label: t('sidebar.materials', '素材管理'), icon: FolderCog },
      ],
    },
    {
      id: 'monitoring',
      label: '监控统计',
      icon: Activity,
      minRole: 'pro',
      items: [
        { path: '/token', label: t('sidebar.tokenMonitor', '用量监控'), icon: Coins },
        { path: '/capacity', label: t('sidebar.capacityMonitor', '用量配额'), icon: Gauge },
        { path: '/stats', label: t('sidebar.stats', '执行统计'), icon: BarChart3 },
        { path: '/audit', label: t('sidebar.audit', '内部审计日志'), icon: Shield },
        { path: '/external-api-logs', label: t('sidebar.externalApiLogs', '外部调用日志'), icon: Globe },
      ],
    },
    {
      id: 'automation',
      label: '自动化',
      icon: FolderCog,
      minRole: 'pro',
      items: [
        { path: '/workflow-builder', label: t('sidebar.workflowBuilder', '工作流编排'), icon: GitBranch },
        { path: '/workflow-marketplace', label: '模板市场', icon: Store },
        { path: '/workflow-templates', label: t('sidebar.workflowTemplates', '流程管理'), icon: Layers },
        { path: '/cron', label: t('sidebar.cronManagement', '定时任务'), icon: Clock },
        { path: '/webhooks', label: 'Webhooks', icon: Webhook },
        { path: '/dead-letter-queue', label: t('sidebar.deadLetterQueue', '死信队列'), icon: AlertTriangle },
      ],
    },
    {
      id: 'system',
      label: '系统管理',
      icon: Lock,
      minRole: 'super',
      items: [
        { path: '/user-management', label: t('sidebar.userManagement', '用户管理'), icon: Users },
        { path: '/invitation-codes', label: t('sidebar.invitationCodes', '邀请码'), icon: Key },
        { path: '/service-nodes', label: t('sidebar.serviceNodes', '节点权限'), icon: Server },
      ],
    },
  ]
}
