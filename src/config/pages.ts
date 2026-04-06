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

export interface PageConfig {
  title: string
  description?: string
  icon: LucideIcon
}

export const PAGE_CONFIGS: Record<string, PageConfig> = {
  '/text': {
    title: '文本生成',
    description: '使用 MiniMax API 进行智能文本生成',
    icon: MessageSquare,
  },
  '/voice': {
    title: '语音同步合成',
    description: '实时语音合成服务',
    icon: Mic,
  },
  '/voice-async': {
    title: '语音异步合成',
    description: '批量语音合成与长文本处理',
    icon: MicOff,
  },
  '/image': {
    title: '图像生成',
    description: 'AI 图像生成与编辑',
    icon: Image,
  },
  '/music': {
    title: '音乐生成',
    description: 'AI 音乐创作与生成',
    icon: Music,
  },
  '/video': {
    title: '视频生成',
    description: 'AI 视频内容生成',
    icon: Video,
  },
  '/video-agent': {
    title: '视频 Agent',
    description: '智能视频处理代理',
    icon: VideoIcon,
  },
  '/voice-mgmt': {
    title: '语音管理',
    description: '管理语音资源和音色库',
    icon: User,
  },
  '/files': {
    title: '文件管理',
    description: '上传、管理和组织您的文件',
    icon: FolderOpen,
  },
  '/media': {
    title: '媒体管理',
    description: '管理图像、音频和视频媒体资源',
    icon: HardDrive,
  },
  '/templates': {
    title: '模板库',
    description: '管理和使用提示词模板',
    icon: FileText,
  },
  '/capacity': {
    title: '容量监控',
    description: '监控 API 使用量和配额',
    icon: Gauge,
  },
  '/stats': {
    title: '执行统计',
    description: '查看任务执行统计和分析',
    icon: BarChart3,
  },
  '/audit': {
    title: '审计日志',
    description: '查看系统操作审计记录',
    icon: Shield,
  },
  '/workflow-builder': {
    title: '工作流编辑器',
    description: '创建和编辑自动化工作流',
    icon: GitBranch,
  },
  '/workflow-marketplace': {
    title: '模板市场',
    description: '浏览和使用社区工作流模板',
    icon: Store,
  },
  '/workflow-templates': {
    title: '流程管理',
    description: '管理工作流模板和实例',
    icon: Layers,
  },
  '/cron': {
    title: '定时任务',
    description: '创建和管理定时执行任务',
    icon: Clock,
  },
  '/webhooks': {
    title: 'Webhooks',
    description: '配置和管理 Webhook 通知',
    icon: Webhook,
  },
  '/dead-letter-queue': {
    title: '死信队列',
    description: '查看和处理失败任务',
    icon: AlertTriangle,
  },
  '/user-management': {
    title: '用户管理',
    description: '管理系统用户和权限',
    icon: Users,
  },
  '/invitation-codes': {
    title: '邀请码管理',
    description: '创建和管理用户邀请码',
    icon: Key,
  },
  '/service-nodes': {
    title: '节点权限',
    description: '管理服务节点访问权限',
    icon: Shield,
  },
}

export function getPageConfig(path: string): PageConfig | undefined {
  return PAGE_CONFIGS[path]
}