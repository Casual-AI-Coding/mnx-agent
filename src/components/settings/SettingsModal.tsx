import { createPortal } from 'react-dom'
import { X, Settings } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/stores/auth'
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
import { AccountSettingsPanel } from '@/components/settings/categories/AccountSettingsPanel'
import { ApiSettingsPanel } from '@/components/settings/categories/ApiSettingsPanel'
import { UISettingsPanel } from '@/components/settings/categories/UISettingsPanel'
import { GenerationSettingsPanel } from '@/components/settings/categories/GenerationSettingsPanel'
import { CronSettingsPanel } from '@/components/settings/categories/CronSettingsPanel'
import { WorkflowSettingsPanel } from '@/components/settings/categories/WorkflowSettingsPanel'
import { NotificationSettingsPanel } from '@/components/settings/categories/NotificationSettingsPanel'
import { MediaSettingsPanel } from '@/components/settings/categories/MediaSettingsPanel'
import { PrivacySettingsPanel } from '@/components/settings/categories/PrivacySettingsPanel'
import { AccessibilitySettingsPanel } from '@/components/settings/categories/AccessibilitySettingsPanel'

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

const CATEGORY_TITLES: Record<string, { title: string; description: string }> = {
  account: { title: '账户设置', description: '管理个人信息、语言、时区等' },
  api: { title: 'API 配置', description: '配置 MiniMax API 密钥和区域设置' },
  ui: { title: '界面设置', description: '自定义主题、布局、动画效果' },
  generation: { title: '生成设置', description: '配置文本、语音、图像、音乐、视频生成默认参数' },
  cron: { title: '定时任务', description: '配置调度器默认参数和重试策略' },
  workflow: { title: '工作流设置', description: '配置工作流编辑器偏好' },
  notification: { title: '通知设置', description: '配置 Webhook、邮件、桌面通知' },
  media: { title: '媒体存储', description: '配置文件存储路径和命名规则' },
  privacy: { title: '隐私安全', description: '管理数据和令牌安全设置' },
  accessibility: { title: '无障碍设置', description: '配置辅助功能和键盘导航' },
}

function CategoryPanel({ category }: { category: string }) {
  switch (category) {
    case 'account':
      return <AccountSettingsPanel />
    case 'api':
      return <ApiSettingsPanel />
    case 'ui':
      return <UISettingsPanel />
    case 'generation':
      return <GenerationSettingsPanel />
    case 'cron':
      return <CronSettingsPanel />
    case 'workflow':
      return <WorkflowSettingsPanel />
    case 'notification':
      return <NotificationSettingsPanel />
    case 'media':
      return <MediaSettingsPanel />
    case 'privacy':
      return <PrivacySettingsPanel />
    case 'accessibility':
      return <AccessibilitySettingsPanel />
    default:
      return <AccountSettingsPanel />
  }
}

interface SettingsModalProps {
  open: boolean
  onClose: () => void
  initialCategory?: string
}

export function SettingsModal({ open, onClose, initialCategory = 'account' }: SettingsModalProps) {
  const [shouldRender, setShouldRender] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [activeCategory, setActiveCategory] = useState(initialCategory)
  const { user } = useAuthStore()

  useEffect(() => {
    if (open) {
      setShouldRender(true)
      requestAnimationFrame(() => setIsAnimating(true))
    } else {
      setIsAnimating(false)
      const timer = setTimeout(() => setShouldRender(false), 300)
      return () => clearTimeout(timer)
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      setActiveCategory(initialCategory)
    }
  }, [open, initialCategory])

  if (!shouldRender) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const categoryInfo = CATEGORY_TITLES[activeCategory] || CATEGORY_TITLES.account

  return createPortal(
    <div
      className={`
        fixed inset-0 z-50 flex items-center justify-center p-4
        transition-all duration-300 ease-out
        ${isAnimating ? 'opacity-100' : 'opacity-0'}
      `}
      onClick={handleBackdropClick}
    >
      <div
        className={`
          absolute inset-0 bg-foreground/10 backdrop-blur-md
          transition-opacity duration-300
          ${isAnimating ? 'opacity-100' : 'opacity-0'}
        `}
      />

      <div
        className={`
          relative w-full max-w-5xl h-[85vh] overflow-hidden
          bg-gradient-to-br from-card via-secondary to-card
          border border-border rounded-2xl shadow-2xl
          transition-all duration-300 ease-out
          ${isAnimating
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 translate-y-4'
          }
        `}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary-500/5 via-transparent to-transparent pointer-events-none" />

        <div className="relative flex items-center justify-between px-6 py-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
              <Settings className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Settings</h2>
              <p className="text-sm text-muted-foreground">{categoryInfo.title}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="group p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all duration-200"
          >
            <X className="w-5 h-5 transition-transform duration-200 group-hover:rotate-90" />
          </button>
        </div>

        <div className="relative flex h-[calc(85vh-65px)]">
          <aside className="w-56 border-r border-border/50 bg-muted/10 overflow-y-auto">
            <nav className="flex flex-col gap-0.5 p-2">
              {SETTINGS_CATEGORIES.map((category) => {
                const isActive = activeCategory === category.id
                const Icon = category.icon

                return (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors text-left",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{category.label}</div>
                      <div className={cn(
                        "text-xs truncate",
                        isActive ? "text-primary-foreground/70" : "text-muted-foreground"
                      )}>
                        {category.description}
                      </div>
                    </div>
                  </button>
                )
              })}
            </nav>
          </aside>

          <main className="flex-1 overflow-y-auto p-6">
            {!user ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                请先登录以查看设置
              </div>
            ) : (
              <motion.div
                key={activeCategory}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-foreground">{categoryInfo.title}</h3>
                  <p className="text-sm text-muted-foreground">{categoryInfo.description}</p>
                </div>
                <CategoryPanel category={activeCategory} />
              </motion.div>
            )}
          </main>
        </div>
      </div>
    </div>,
    document.body
  )
}