import { useState } from 'react'
import { Code, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { HeaderPopup } from './HeaderPopup'
import { toastSuccess, toastError } from '@/lib/toast'

interface APIRefButtonProps {
  generateCurl: () => string
  title?: string
}

export function APIRefButton({ generateCurl, title = 'API 参考' }: APIRefButtonProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    const text = generateCurl()
    const copyToClipboard = () => {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      try {
        document.execCommand('copy')
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        toastSuccess('已复制到剪贴板')
      } catch {
        toastError('复制失败')
      }
      document.body.removeChild(textarea)
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
          toastSuccess('已复制到剪贴板')
        })
        .catch(copyToClipboard)
    } else {
      copyToClipboard()
    }
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(!open)}
        className="h-8 w-8"
        title={title}
      >
        <Code className="w-4 h-4" />
      </Button>
      <HeaderPopup open={open} onClose={() => setOpen(false)} title={title}>
        <div className="relative">
          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent/80 bg-secondary/50"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3" />
                <span>已复制</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>复制</span>
              </>
            )}
          </button>
          <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap bg-secondary/50 p-3 rounded-lg overflow-x-auto max-h-[300px]">
            {generateCurl()}
          </pre>
        </div>
      </HeaderPopup>
    </div>
  )
}