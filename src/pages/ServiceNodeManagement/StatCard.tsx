import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  color: string
  compact?: boolean
}

export function StatCard({ title, value, icon: Icon, color, compact = false }: StatCardProps) {
  if (compact) {
    return (
      <motion.div
        whileHover={{ y: -1 }}
        transition={{ type: 'spring', stiffness: 400 }}
        className="relative overflow-hidden rounded-lg border border-border/50 shadow-sm"
      >
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
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      <Card className="relative overflow-hidden border-border/50">
        <div className={cn(
          'absolute inset-0 bg-gradient-to-br opacity-10',
          color
        )} />
        <CardContent className="relative p-5">
          <div className="flex items-center gap-4">
            <div className={cn(
              'p-3 rounded-xl bg-gradient-to-br shadow-lg shadow-black/20',
              color
            )}>
              <Icon className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground/70 font-medium uppercase tracking-wider">{title}</p>
              <p className="text-2xl font-bold text-foreground">{value}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
