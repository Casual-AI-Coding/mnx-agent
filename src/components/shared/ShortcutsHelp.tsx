import { useState, useEffect, useCallback } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { X, Keyboard } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface ShortcutItem {
  key: string
  description: string
}

interface ShortcutSection {
  title: string
  shortcuts: ShortcutItem[]
}

const shortcutsData: ShortcutSection[] = [
  {
    title: '全局快捷键',
    shortcuts: [
      { key: 'Ctrl + /', description: '显示快捷键帮助' },
      { key: 'Esc', description: '关闭模态框/对话框' },
    ],
  },
  {
    title: '文本生成',
    shortcuts: [
      { key: 'Ctrl + Enter', description: '发送消息' },
      { key: 'Ctrl + Shift + C', description: '复制最后一条回复' },
      { key: 'Enter', description: '发送消息（当输入框聚焦时）' },
      { key: 'Shift + Enter', description: '换行' },
    ],
  },
  {
    title: '图片生成',
    shortcuts: [
      { key: 'Ctrl + Enter', description: '生成图片' },
    ],
  },
]

export function ShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false)

  const openHelp = useCallback(() => {
    setIsOpen(true)
  }, [])

  const closeHelp = useCallback(() => {
    setIsOpen(false)
  }, [])

  useHotkeys('ctrl+/, shift+/', openHelp, {
    preventDefault: true,
    enableOnFormTags: true,
  })

  useHotkeys('esc', closeHelp, {
    enabled: isOpen,
    preventDefault: true,
  })

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeHelp()
    }
  }

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={openHelp}
        className="fixed bottom-4 right-4 gap-2 opacity-50 hover:opacity-100 transition-opacity"
        title="快捷键帮助 (Ctrl+/)"
      >
        <Keyboard className="w-4 h-4" />
        <span className="hidden sm:inline">快捷键</span>
      </Button>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <Card className="w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Keyboard className="w-5 h-5" />
            键盘快捷键
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={closeHelp}
            className="h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-0 overflow-y-auto max-h-[60vh]">
          {shortcutsData.map((section, sectionIndex) => (
            <div
              key={section.title}
              className={`p-4 ${sectionIndex !== shortcutsData.length - 1 ? 'border-b' : ''}`}
            >
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                {section.title}
              </h3>
              <div className="space-y-2">
                {section.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.key}
                    className="flex items-center justify-between py-1"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <kbd className="bg-gray-700 dark:bg-gray-600 rounded px-2 py-1 text-xs font-mono text-white shrink-0 ml-4">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
        <div className="p-4 border-t bg-muted/50">
          <p className="text-xs text-muted-foreground text-center">
            按 <kbd className="bg-gray-700 dark:bg-gray-600 rounded px-1.5 py-0.5 text-xs font-mono text-white">Esc</kbd> 或点击外部关闭此窗口
          </p>
        </div>
      </Card>
    </div>
  )
}

export default ShortcutsHelp
