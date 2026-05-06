import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export function StatCard({ title, value, icon: Icon, color, compact = false }: {
  title: string
  value: number
  icon: React.ElementType
  color: string
  compact?: boolean
}) {
  if (compact) {
    return (
      <motion.div whileHover={{ y: -1 }} transition={{ type: 'spring', stiffness: 400 }} className="relative overflow-hidden rounded-lg border border-border/50 shadow-sm">
        <div className={cn('absolute inset-0 opacity-15 bg-gradient-to-br', color)} />
        <div className="relative flex items-center gap-2.5 px-3 py-2">
          <div className={cn('p-1.5 rounded-md bg-gradient-to-br shadow-sm', color)}>
            <Icon className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wider">{title}</p>
            <p className="text-base font-bold text-foreground">{value}</p>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div whileHover={{ y: -2, scale: 1.01 }} transition={{ type: 'spring', stiffness: 400 }}>
      <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card p-4">
        <div className={cn('absolute inset-0 opacity-10 bg-gradient-to-br', color)} />
        <div className="relative flex items-center gap-3">
          <div className={cn('p-2 rounded-lg bg-gradient-to-br shadow-lg', color)}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground/70 font-medium uppercase tracking-wider">{title}</p>
            <p className="text-xl font-bold text-foreground">{value}</p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
