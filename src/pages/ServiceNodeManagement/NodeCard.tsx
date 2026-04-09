import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { cn } from '@/lib/utils'
import { roles, status } from '@/themes/tokens/index'
import type { NodeCardProps, UserRole, RoleConfig } from './types'

const ROLE_CONFIG: Record<UserRole, RoleConfig> = {
  super: { label: 'Super', variant: 'destructive', color: roles.super.text },
  admin: { label: 'Admin', variant: 'default', color: roles.admin.text },
  pro: { label: 'Pro', variant: 'secondary', color: roles.pro.text },
  user: { label: 'User', variant: 'outline', color: roles.user.text },
}

export function NodeCard({ node, saving, updateNode, gradient }: NodeCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <motion.div
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ y: -2 }}
      className={cn(
        'relative rounded-xl border p-4 transition-all duration-200',
        'backdrop-blur-sm',
        node.is_enabled
          ? 'bg-card/80 border-border/50 shadow-lg shadow-black/5'
          : 'bg-muted/30 border-border/30 opacity-60'
      )}
    >
      {/* Gradient top bar */}
      <div className={cn(
        'absolute top-0 left-4 right-4 h-0.5 rounded-full opacity-50',
        'bg-gradient-to-r',
        gradient
      )} />

      {/* Header: Status and Name */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <motion.div
            animate={{
              scale: node.is_enabled ? 1 : 0.9,
              opacity: node.is_enabled ? 1 : 0.5
            }}
          >
            {node.is_enabled ? (
              <CheckCircle2 className={cn('w-4 h-4 flex-shrink-0', status.success.text)} />
            ) : (
              <XCircle className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
            )}
          </motion.div>
          <span className={cn(
            'font-semibold text-sm truncate',
            !node.is_enabled && 'text-muted-foreground/70'
          )}>
            {node.display_name}
          </span>
        </div>
        <Switch
          checked={node.is_enabled}
          onCheckedChange={(checked) => updateNode(node.id, { is_enabled: checked })}
          disabled={saving === node.id}
          className="scale-75"
        />
      </div>

      {/* Method path */}
      <code className="text-[10px] px-2 py-1 rounded-md font-mono block truncate bg-muted/50 text-muted-foreground/70 mb-3">
        {node.service_name}.{node.method_name}
      </code>

      {/* Role selector */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground/50 font-medium uppercase tracking-wider">
          最低角色
        </span>
        <Select
          value={node.min_role}
          onValueChange={(value) => updateNode(node.id, { min_role: value as UserRole })}
        >
          <SelectTrigger
            className="w-20 h-7 text-[11px] px-2 border-0 bg-muted/50 hover:bg-muted transition-colors"
            disabled={saving === node.id}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ROLE_CONFIG).map(([role, config]) => (
              <SelectItem key={role} value={role} className="text-xs">
                <span className={config.color}>{config.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Saving overlay */}
      <AnimatePresence>
        {saving === node.id && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/90 backdrop-blur-sm flex items-center justify-center rounded-xl"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <Loader2 className="w-5 h-5 text-primary" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hover glow */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? 0.15 : 0 }}
        className={cn(
          'absolute inset-0 rounded-xl pointer-events-none',
          'bg-gradient-to-br',
          gradient
        )}
        style={{ filter: 'blur(25px)' }}
      />
    </motion.div>
  )
}
