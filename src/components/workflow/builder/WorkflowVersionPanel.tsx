import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, GitCommit, History, Loader2 } from 'lucide-react'
import type { WorkflowVersion } from '@/lib/api/workflows'
import { cn } from '@/lib/utils'
import { status } from '@/themes/tokens'

interface WorkflowVersionPanelProps {
  versions: WorkflowVersion[]
  activeVersion: WorkflowVersion | null
  isLoading: boolean
  onClose: () => void
  onVersionChange: (versionId: string) => void
  onActivateVersion: (versionId: string) => void
}

export function WorkflowVersionPanel({
  versions,
  activeVersion,
  isLoading,
  onClose,
  onVersionChange,
  onActivateVersion,
}: WorkflowVersionPanelProps) {
  return (
    <motion.div
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 320, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="fixed right-0 top-14 bottom-0 w-80 bg-background border-l border-border shadow-xl z-40 flex flex-col"
    >
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Version History</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-secondary transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground/70" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No versions yet
          </div>
        ) : (
          versions.map((version) => (
            <div
              key={version.id}
              className={cn(
                'p-3 rounded-lg border transition-colors',
                activeVersion?.id === version.id
                  ? 'bg-primary/10 border-primary/30'
                  : 'bg-card border-border hover:border-border/80'
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <GitCommit className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-sm">v{version.version_number}</span>
                  {version.is_active && (
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded', status.success.bgSubtle, status.success.text)}>
                      active
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(version.created_at).toLocaleDateString()}
                </span>
              </div>
              {version.change_summary && (
                <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                  {version.change_summary}
                </p>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => onVersionChange(version.id)}
                  className="flex-1 px-2 py-1.5 text-xs font-medium bg-secondary text-foreground rounded hover:bg-secondary/80 transition-colors"
                >
                  Load
                </button>
                {!version.is_active && (
                  <button
                    onClick={() => onActivateVersion(version.id)}
                    className="flex-1 px-2 py-1.5 text-xs font-medium bg-primary/20 text-primary rounded hover:bg-primary/30 transition-colors"
                  >
                    Activate
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  )
}
