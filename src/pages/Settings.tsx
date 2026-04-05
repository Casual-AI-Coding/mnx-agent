import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/stores/auth'
import { Card, CardContent } from '@/components/ui/Card'
import { SettingsLayout } from '@/components/settings/SettingsLayout'
import { SettingsContent } from '@/components/settings/SettingsContent'
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
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

export default function SettingsPage() {
  const { category } = useParams<{ category: string }>()
  const activeCategory = category || 'account'
  const { user } = useAuthStore()

  const categoryInfo = CATEGORY_TITLES[activeCategory] || CATEGORY_TITLES.account

  if (!user) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="border-border/50 bg-card/50">
          <CardContent className="py-8 text-center text-muted-foreground/70">
            请先登录以查看设置
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <SettingsLayout activeCategory={activeCategory}>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={sectionVariants}>
          <SettingsContent
            title={categoryInfo.title}
            description={categoryInfo.description}
          >
            <CategoryPanel category={activeCategory} />
          </SettingsContent>
        </motion.div>
      </motion.div>
    </SettingsLayout>
  )
}
