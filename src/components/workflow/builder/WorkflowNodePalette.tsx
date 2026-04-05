import * as React from 'react'
import { motion } from 'framer-motion'
import {
  Zap,
  GitBranch,
  Repeat,
  MessageSquare,
  Layers,
  ChevronDown,
  Wrench,
  Clock,
  Shield,
  Loader2,
} from 'lucide-react'
import type { GroupedActionNodes } from '@/types/cron'
import { apiClient } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { status, services } from '@/themes/tokens'

interface AvailableActionItem {
  service: string
  method: string
  label: string
}

interface NodePaletteItem {
  type: string
  label: string
  icon: React.ElementType
  category: 'logic' | 'action'
  description: string
}

const logicNodes: NodePaletteItem[] = [
  {
    type: 'condition',
    label: 'Condition',
    icon: GitBranch,
    category: 'logic',
    description: 'Conditional branching logic',
  },
  {
    type: 'loop',
    label: 'Loop',
    icon: Repeat,
    category: 'logic',
    description: 'Iterate over data',
  },
  {
    type: 'transform',
    label: 'Transform',
    icon: Zap,
    category: 'logic',
    description: 'Data transformation',
  },
  {
    type: 'delay',
    label: 'Delay',
    icon: Clock,
    category: 'logic',
    description: 'Pause execution',
  },
  {
    type: 'errorBoundary',
    label: 'Error Boundary',
    icon: Shield,
    category: 'logic',
    description: 'Catch errors from downstream nodes',
  },
]

const categoryIcons: Record<string, React.ElementType> = {
  'MiniMax API': MessageSquare,
  'Database': Layers,
  'Logic': GitBranch,
  'default': Wrench,
}

interface WorkflowNodePaletteProps {
  onDragStart: (event: React.DragEvent, nodeType: string, actionData?: AvailableActionItem) => void
}

export function WorkflowNodePalette({ onDragStart }: WorkflowNodePaletteProps) {
  const [availableActions, setAvailableActions] = React.useState<GroupedActionNodes>({})
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [expandedCategory, setExpandedCategory] = React.useState<string | null>(null)

  React.useEffect(() => {
    apiClient.get<{ success: boolean; data: GroupedActionNodes }>('/workflows/available-actions')
      .then(data => {
        if (data.success && data.data) {
          setAvailableActions(data.data)
        } else {
          setError('Failed to load actions')
        }
      })
      .catch(err => {
        console.error('Failed to load available actions:', err)
        setError('Failed to load actions')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const toggleCategory = (category: string) => {
    setExpandedCategory(prev => prev === category ? null : category)
  }

  return (
    <div className="w-56 bg-muted/30 border-r border-border flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">节点面板</h3>
        <p className="text-xs text-muted-foreground/70 mt-0.5">拖拽节点到画布</p>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-2 space-y-3">
          <div>
            <h4 className={cn('text-xs font-medium uppercase tracking-wider mb-2 px-1', services.image.text)}>
              逻辑节点
            </h4>
            <div className="space-y-1">
              {logicNodes.map((item) => {
                const Icon = item.icon
                return (
                  <div
                    key={item.type}
                    draggable
                    onDragStart={(e) => onDragStart(e, item.type)}
                    className="flex items-center gap-2 p-2 rounded-md cursor-grab hover:bg-muted/50 transition-colors group"
                  >
                    <div className="p-1.5 rounded bg-muted/50 group-hover:bg-muted">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.label}</p>
                      <p className="text-[10px] text-muted-foreground/50 truncate">{item.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div>
            <h4 className={cn('text-xs font-medium uppercase tracking-wider mb-2 px-1', status.info.text)}>
              动作节点
            </h4>
            {loading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="text-xs text-destructive/70 p-2">
                {error}
              </div>
            ) : Object.keys(availableActions).length === 0 ? (
              <div className="text-xs text-muted-foreground/50 p-2">
                暂无可用动作
              </div>
            ) : (
              <div className="space-y-1">
                {Object.entries(availableActions).map(([category, actions]) => {
                  const Icon = categoryIcons[category] || categoryIcons.default
                  const isExpanded = expandedCategory === category
                  return (
                    <div key={category} className="border border-border/50 rounded-md overflow-hidden">
                      <button
                        onClick={() => toggleCategory(category)}
                        className="w-full flex items-center gap-2 p-2 bg-muted/20 hover:bg-muted/40 transition-colors"
                      >
                        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="flex-1 text-left text-sm font-medium text-foreground truncate">{category}</span>
                        <ChevronDown className={cn('w-3.5 h-3.5 text-muted-foreground/50 transition-transform', isExpanded && 'rotate-180')} />
                        <span className="text-[10px] text-muted-foreground/50">{actions.length}</span>
                      </button>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: 'easeInOut' }}
                          className="border-t border-border/30 bg-background/50 overflow-hidden"
                        >
                          {actions.map((action) => (
                            <div
                              key={`${action.service}.${action.method}`}
                              draggable
                              onDragStart={(e: React.DragEvent<HTMLDivElement>) => onDragStart(e, 'action', {
                                service: action.service,
                                method: action.method,
                                label: action.label,
                              })}
                              className="flex items-center gap-2 p-2 cursor-grab hover:bg-muted/30 transition-colors border-b border-border/20 last:border-0"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm truncate text-foreground">{action.label}</p>
                                <p className="text-[10px] text-muted-foreground/50 truncate font-mono">{action.service}.{action.method}</p>
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export { logicNodes }
export type { AvailableActionItem }
