import { useNavigate } from 'react-router-dom'
import { Home, ArrowLeft, FolderOpen, Clock, GitBranch } from 'lucide-react'

const QUICK_LINKS = [
  { to: '/', icon: Home, label: '首页仪表盘' },
  { to: '/media', icon: FolderOpen, label: '媒体库' },
  { to: '/cron', icon: Clock, label: '定时任务' },
  { to: '/workflow-builder', icon: GitBranch, label: '工作流' },
]

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold bg-gradient-to-r from-primary-400 via-secondary-400 to-rose-400 bg-clip-text text-transparent mb-4">
          404
        </h1>
        <p className="text-lg text-muted-foreground mb-2">页面未找到</p>
        <p className="text-sm text-muted-foreground/70 mb-8">
          您访问的页面不存在或已被移除
        </p>

        <div className="flex items-center justify-center gap-3 mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-all"
          >
            <Home className="w-4 h-4" />
            返回首页
          </button>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-secondary/50 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            返回上一页
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {QUICK_LINKS.map(link => (
            <button
              key={link.to}
              onClick={() => navigate(link.to)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground border border-border/50 rounded-lg hover:bg-secondary/50 transition-all"
            >
              <link.icon className="w-3.5 h-3.5" />
              {link.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
