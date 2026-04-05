import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  User,
  Key,
  Palette,
  Sparkles,
  Clock,
  GitBranch,
  Bell,
  Folder,
  Shield,
  Accessibility,
} from 'lucide-react'

interface SettingsCategoryInfo {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}

const SETTINGS_CATEGORIES: SettingsCategoryInfo[] = [
  { id: 'account', label: '账户', icon: User, description: '个人信息、语言、时区' },
  { id: 'api', label: 'API 配置', icon: Key, description: 'MiniMax API 密钥、区域' },
  { id: 'ui', label: '界面', icon: Palette, description: '主题、布局、动画' },
  { id: 'generation', label: '生成设置', icon: Sparkles, description: '文本、语音、图像、音乐、视频' },
  { id: 'cron', label: '定时任务', icon: Clock, description: '调度器默认配置' },
  { id: 'workflow', label: '工作流', icon: GitBranch, description: '编辑器偏好设置' },
  { id: 'notification', label: '通知', icon: Bell, description: 'Webhook、邮件、桌面通知' },
  { id: 'media', label: '媒体存储', icon: Folder, description: '文件存储、命名规则' },
  { id: 'privacy', label: '隐私安全', icon: Shield, description: '数据、令牌管理' },
  { id: 'accessibility', label: '无障碍', icon: Accessibility, description: '屏幕阅读器、键盘导航' },
]

interface SettingsSidebarProps {
  activeCategory: string
}

export function SettingsSidebar({ activeCategory }: SettingsSidebarProps) {
  const location = useLocation()

  return (
    <aside className="w-64 border-r bg-muted/10">
      <nav className="flex flex-col gap-1 p-4">
        {SETTINGS_CATEGORIES.map((category) => {
          const isActive = activeCategory === category.id
          const Icon = category.icon

          return (
            <Link
              key={category.id}
              to={`/settings/${category.id}`}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <div>
                <div className="font-medium">{category.label}</div>
                <div className={cn("text-xs", isActive ? "text-primary-foreground/70" : "text-muted-foreground")}>
                  {category.description}
                </div>
              </div>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
