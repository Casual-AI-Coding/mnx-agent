import { Copy, Check } from 'lucide-react'
import { Button } from './Button'
import { useClipboard } from '@/hooks/useClipboard'
import { cn } from '@/lib/utils'

interface CopyButtonProps {
  text: string
  size?: 'sm' | 'md'
  className?: string
  label?: string
}

export function CopyButton({ text, size = 'sm', className, label }: CopyButtonProps) {
  const { copied, copy } = useClipboard()

  const handleClick = async () => {
    await copy(text)
  }

  return (
    <Button
      variant="ghost"
      size={size === 'sm' ? 'sm' : 'default'}
      onClick={handleClick}
      className={cn(
        'opacity-50 hover:opacity-100 transition-opacity',
        className
      )}
      title={copied ? '已复制' : '复制'}
    >
      {copied ? (
        <Check className={cn('text-green-500', size === 'sm' ? 'w-4 h-4' : 'w-5 h-5')} />
      ) : (
        <Copy className={size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} />
      )}
      {label && <span className="ml-2">{label}</span>}
    </Button>
  )
}
