import { motion } from 'framer-motion'
import { ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SortField } from '@/stores/materials'

export function SortButton({ field, currentField, order, onClick, children }: {
  field: SortField
  currentField: SortField
  order: 'asc' | 'desc'
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
        'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
        isActive
          ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
      )}
    >
      {children}
      {isActive && (
        <motion.div
          initial={{ rotate: 0 }}
          animate={{ rotate: order === 'asc' ? 0 : 180 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </motion.div>
      )}
    </motion.button>
  )
}
