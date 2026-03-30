import { NavLink } from 'react-router-dom'
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
  BarChart3,
  Settings
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { path: '/text', label: '文本生成', icon: MessageSquare },
  { path: '/voice', label: '同步语音', icon: Mic },
  { path: '/voice-async', label: '异步语音', icon: MicOff },
  { path: '/image', label: '图片生成', icon: Image },
  { path: '/music', label: '音乐生成', icon: Music },
  { path: '/video', label: '视频生成', icon: Video },
  { path: '/video-agent', label: '视频Agent', icon: VideoIcon },
  { path: '/voice-mgmt', label: '音色管理', icon: User },
  { path: '/files', label: '文件管理', icon: FolderOpen },
  { path: '/token', label: '用量监控', icon: BarChart3 },
]

export default function Sidebar() {
  return (
    <aside className="w-64 border-r bg-card flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">M</span>
          </div>
          <span className="font-semibold text-lg">MiniMax 工具集</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent hover:text-accent-foreground'
              )
            }
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Settings */}
      <div className="p-2 border-t">
        <button className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-accent w-full">
          <Settings className="w-4 h-4" />
          设置
        </button>
      </div>
    </aside>
  )
}