import { motion } from 'framer-motion'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { status } from '@/themes/tokens'
import type { SortField, SortOrder } from '../InvitationCodes/types'

export function SortButton({
  field,
  currentField,
  order,
  onClick,
  children,
}: {
  field: SortField
  currentField: SortField
  order: SortOrder
  onClick: () => void
  children: React.ReactNode
}) {
  const isActive = currentField === field
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1',
        isActive
          ? cn(status.warning.bg, status.warning.foreground, status.warning.border)
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent'
      )}
    >
      {children}
      {isActive && (
        order === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
      )}
    </motion.button>
  )
}
