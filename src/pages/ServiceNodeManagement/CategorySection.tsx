import { motion } from 'framer-motion'
import { Shield, Zap, Database, HardDrive, Clock, Server } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { roles, status } from '@/themes/tokens/index'
import { NodeCard } from './NodeCard'
import type { CategorySectionProps, UserRole, CategoryConfig } from './types'

const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  'MiniMax API': {
    icon: Zap,
    gradient: roles.admin.gradient,
    bgGradient: cn('from-primary/20', 'to-info/20'),
    borderColor: roles.admin.border,
    glowColor: 'shadow-primary/20',
  },
  'Database': {
    icon: Database,
    gradient: roles.user.gradient,
    bgGradient: cn('from-success/20', 'to-info/20'),
    borderColor: roles.user.border,
    glowColor: 'shadow-success/20',
  },
  'Capacity': {
    icon: Shield,
    gradient: roles.super.gradient,
    bgGradient: cn('from-warning/20', 'to-error/20'),
    borderColor: roles.super.border,
    glowColor: 'shadow-warning/20',
  },
  'Media Storage': {
    icon: HardDrive,
    gradient: roles.pro.gradient,
    bgGradient: cn('from-secondary/20', 'to-accent/20'),
    borderColor: roles.pro.border,
    glowColor: 'shadow-secondary/20',
  },
  'Queue Processing': {
    icon: Clock,
    gradient: status.error.gradient,
    bgGradient: cn(status.error.bgSubtle, status.error.bg),
    borderColor: status.error.border,
    glowColor: 'shadow-destructive/20',
  },
}

export function CategorySection({ category, nodes, saving, updateNode }: CategorySectionProps) {
  const config = CATEGORY_CONFIG[category] || {
    icon: Server,
    gradient: status.pending.gradient,
    bgGradient: cn(status.pending.bgSubtle, status.pending.bg),
    borderColor: status.pending.border,
    glowColor: 'shadow-muted/20',
  }
  const Icon = config.icon
  const enabledInCategory = nodes.filter(n => n.is_enabled).length
  const enabledPercent = Math.round((enabledInCategory / nodes.length) * 100)

  return (
    <Card className={cn(
      'relative overflow-hidden border-2 transition-all duration-300',
      'hover:shadow-xl hover:shadow-primary/5',
      config.borderColor
    )}>
      {/* Background gradient */}
      <div className={cn(
        'absolute inset-0 bg-gradient-to-br opacity-30',
        config.bgGradient
      )} />

      {/* Decorative orb */}
      <div className={cn(
        'absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-20',
        'bg-gradient-to-br',
        config.gradient
      )} />

      <CardContent className="relative p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            className={cn(
              'p-3 rounded-xl bg-gradient-to-br shadow-lg',
              config.gradient,
              config.glowColor
            )}
          >
            <Icon className="w-6 h-6 text-foreground" />
          </motion.div>

          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-foreground">{category}</h3>
              <Badge variant="secondary" className="font-mono">
                {enabledInCategory}/{nodes.length}
              </Badge>
            </div>

            {/* Progress bar */}
            <div className="flex items-center gap-3 mt-2">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${enabledPercent}%` }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className={cn('h-full rounded-full bg-gradient-to-r', config.gradient)}
                />
              </div>
              <span className="text-xs text-muted-foreground/70 font-medium">
                {enabledPercent}% 已启用
              </span>
            </div>
          </div>
        </div>

        {/* Nodes grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {nodes.map((node, index) => (
            <motion.div
              key={node.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <NodeCard node={node} saving={saving} updateNode={updateNode} gradient={config.gradient} />
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
