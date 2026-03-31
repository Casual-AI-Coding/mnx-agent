import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
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

function ShortcutsHelpModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  useHotkeys('esc', onClose, { enabled: isOpen, preventDefault: true })

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  return createPortal(
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
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
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
                  <div key={shortcut.key} className="flex items-center justify-between py-1">
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
    </div>,
    document.body
  )
}

export function ShortcutsHelpButton() {
  const [isOpen, setIsOpen] = useState(false)

  const openHelp = useCallback(() => setIsOpen(true), [])
  const closeHelp = useCallback(() => setIsOpen(false), [])

  useHotkeys('ctrl+/, shift+/', openHelp, { preventDefault: true, enableOnFormTags: true })

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

  return (
    <>
      <button
        onClick={openHelp}
        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        title="快捷键帮助 (Ctrl+/)"
      >
        <Keyboard className="w-4 h-4" />
      </button>
      <ShortcutsHelpModal isOpen={isOpen} onClose={closeHelp} />
    </>
  )
}

export function ShortcutsHelp() {
  return <ShortcutsHelpButton />
}

export default ShortcutsHelp
