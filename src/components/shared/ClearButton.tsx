import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface ClearButtonProps {
  onClick: () => void
  label?: string
}

export function ClearButton({ onClick, label = '清空' }: ClearButtonProps) {
  return (
    <Button variant="outline" size="sm" onClick={onClick}>
      <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
      {label}
    </Button>
  )
}