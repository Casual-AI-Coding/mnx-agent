import { Shield } from 'lucide-react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

export function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string
  value: string | number
  icon: typeof Shield
  color: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg bg-card/secondary', color)}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-muted-foreground/70 text-sm">{title}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
