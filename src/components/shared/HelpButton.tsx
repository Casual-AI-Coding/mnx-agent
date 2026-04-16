import { useState, ReactNode } from 'react'
import { HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { HeaderPopup } from './HeaderPopup'

interface HelpButtonProps {
  title: string
  tips: ReactNode
}

export function HelpButton({ title, tips }: HelpButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(!open)}
        className="h-8 w-8"
      >
        <HelpCircle className="w-4 h-4" />
      </Button>
      <HeaderPopup open={open} onClose={() => setOpen(false)} title={title}>
        {tips}
      </HeaderPopup>
    </div>
  )
}