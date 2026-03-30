import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
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
} from 'lucide-react'
import { cn } from '@/lib/utils'

const debugItems = [
  { path: '/text', label: '文本生成', icon: MessageSquare },
  { path: '/voice', label: '同步语音', icon: Mic },
  { path: '/voice-async', label: '异步语音', icon: MicOff },
  { path: '/image', label: '图片生成', icon: Image },
  { path: '/music', label: '音乐生成', icon: Music },
  { path: '/video', label: '视频生成', icon: Video },
  { path: '/video-agent', label: '视频Agent', icon: VideoIcon },
]

const independentItems = [
  { path: '/voice-mgmt', label: '音色管理', icon: User },
  { path: '/files', label: '文件管理', icon: FolderOpen },
]

export default function Sidebar() {
  const location = useLocation()
  const [isDebugExpanded, setIsDebugExpanded] = useState(true)

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
            <span className="text-sm font-medium flex-1 text-left">调试台</span>
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
          {independentItems.map((item) => {
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
        <div className="flex items-center gap-2 text-dark-400">
          <div className="w-5 h-5 rounded bg-primary-600 flex items-center justify-center">
            <span className="text-white font-bold text-[10px]">M</span>
          </div>
          <span className="text-xs">Created by MiniMax Agent</span>
        </div>
      </div>
    </aside>
  )
}
