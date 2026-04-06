import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { GRADIENT_CLASSES, type GradientVariant } from '@/config/pages'

interface PageHeaderProps {
  icon?: ReactNode
  title: string
  description?: string
  actions?: ReactNode
  className?: string
  gradient?: GradientVariant
}

export function PageHeader({ icon, title, description, actions, className, gradient = 'primary-accent' }: PageHeaderProps) {
  const gradientClass = GRADIENT_CLASSES[gradient]

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn("flex items-center justify-between", className)}
    >
      <div className="flex items-center gap-4">
        {icon && (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.2 }}
            className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 border border-primary/20"
          >
            <div className="text-primary">
              {icon}
            </div>
          </motion.div>
        )}
        <div>
          <motion.h1 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15, duration: 0.3 }}
            className={cn("text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r", gradientClass)}
          >
            {title}
          </motion.h1>
          {description && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="text-muted-foreground/70 mt-1"
            >
              {description}
            </motion.p>
          )}
        </div>
      </div>
      {actions && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.3 }}
          className="flex items-center gap-2"
        >
          {actions}
        </motion.div>
      )}
    </motion.div>
  )
}