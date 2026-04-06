import type { LucideIcon } from 'lucide-react'
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
  HardDrive,
  FileText,
  Gauge,
  BarChart3,
  Shield,
  GitBranch,
  Store,
  Layers,
  Clock,
  Webhook,
  AlertTriangle,
  Users,
  Key,
} from 'lucide-react'

export type GradientVariant = 
  | 'primary-accent'
  | 'secondary-primary'  
  | 'accent-secondary'
  | 'blue-cyan'
  | 'purple-pink'
  | 'orange-amber'
  | 'green-emerald'
  | 'indigo-violet'
  | 'sky-blue'
  | 'rose-pink'
  | 'violet-purple'

export interface PageConfig {
  title: string
  description?: string
  icon: LucideIcon
  gradient?: GradientVariant
}

export const GRADIENT_CLASSES: Record<GradientVariant, string> = {
  'primary-accent': 'from-primary to-accent',
  'secondary-primary': 'from-secondary to-primary',
  'accent-secondary': 'from-accent to-secondary',
  'blue-cyan': 'from-blue-500 to-cyan-500',
  'purple-pink': 'from-purple-500 to-pink-500',
  'orange-amber': 'from-orange-500 to-amber-500',
  'green-emerald': 'from-green-500 to-emerald-500',
  'indigo-violet': 'from-indigo-500 to-violet-500',
  'sky-blue': 'from-sky-400 to-blue-500',
  'rose-pink': 'from-rose-400 to-pink-500',
  'violet-purple': 'from-violet-500 to-purple-600',
}

export const PAGE_CONFIGS: Record<string, PageConfig> = {
  '/text': {
    title: '文本生成',
    description: '使用 MiniMax API 进行智能文本生成',
    icon: MessageSquare,
    gradient: 'indigo-violet',
  },
  '/voice': {
    title: '语音同步合成',
    description: '实时语音合成服务',
    icon: Mic,
    gradient: 'sky-blue',
  },
  '/voice-async': {
    title: '语音异步合成',
    description: '批量语音合成与长文本处理',
    icon: MicOff,
    gradient: 'sky-blue',
  },
  '/image': {
    title: '图像生成',
    description: 'AI 图像生成与编辑',
    icon: Image,
    gradient: 'rose-pink',
  },
  '/music': {
    title: '音乐生成',
    description: 'AI 音乐创作与生成',
    icon: Music,
    gradient: 'violet-purple',
  },
  '/video': {
    title: '视频生成',
    description: 'AI 视频内容生成',
    icon: Video,
    gradient: 'orange-amber',
  },
  '/video-agent': {
    title: '视频 Agent',
    description: '智能视频处理代理',
    icon: VideoIcon,
    gradient: 'orange-amber',
  },
  '/voice-mgmt': {
    title: '语音管理',
    description: '管理语音资源和音色库',
    icon: User,
    gradient: 'green-emerald',
  },
  '/files': {
    title: '文件管理',
    description: '上传、管理和组织您的文件',
    icon: FolderOpen,
    gradient: 'green-emerald',
  },
  '/media': {
    title: '媒体管理',
    description: '管理图像、音频和视频媒体资源',
    icon: HardDrive,
    gradient: 'green-emerald',
  },
  '/templates': {
    title: '模板库',
    description: '管理和使用提示词模板',
    icon: FileText,
    gradient: 'green-emerald',
  },
  '/capacity': {
    title: '容量监控',
    description: '监控 API 使用量和配额',
    icon: Gauge,
    gradient: 'blue-cyan',
  },
  '/stats': {
    title: '执行统计',
    description: '查看任务执行统计和分析',
    icon: BarChart3,
    gradient: 'blue-cyan',
  },
  '/audit': {
    title: '审计日志',
    description: '查看系统操作审计记录',
    icon: Shield,
    gradient: 'blue-cyan',
  },
  '/workflow-builder': {
    title: '工作流编辑器',
    description: '创建和编辑自动化工作流',
    icon: GitBranch,
    gradient: 'purple-pink',
  },
  '/workflow-marketplace': {
    title: '模板市场',
    description: '浏览和使用社区工作流模板',
    icon: Store,
    gradient: 'purple-pink',
  },
  '/workflow-templates': {
    title: '流程管理',
    description: '管理工作流模板和实例',
    icon: Layers,
    gradient: 'purple-pink',
  },
  '/cron': {
    title: '定时任务',
    description: '创建和管理定时执行任务',
    icon: Clock,
    gradient: 'purple-pink',
  },
  '/webhooks': {
    title: 'Webhooks',
    description: '配置和管理 Webhook 通知',
    icon: Webhook,
    gradient: 'purple-pink',
  },
  '/dead-letter-queue': {
    title: '死信队列',
    description: '查看和处理失败任务',
    icon: AlertTriangle,
    gradient: 'orange-amber',
  },
  '/user-management': {
    title: '用户管理',
    description: '管理系统用户和权限',
    icon: Users,
    gradient: 'orange-amber',
  },
  '/invitation-codes': {
    title: '邀请码管理',
    description: '创建和管理用户邀请码',
    icon: Key,
    gradient: 'orange-amber',
  },
  '/service-nodes': {
    title: '节点权限',
    description: '管理服务节点访问权限',
    icon: Shield,
    gradient: 'orange-amber',
  },
}

export function getPageConfig(path: string): PageConfig | undefined {
  return PAGE_CONFIGS[path]
}