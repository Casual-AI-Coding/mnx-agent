import type { ComponentProps } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { WorkflowVersionPanel } from '@/components/workflow/builder'
import { Dialog, DialogFooter } from '@/components/ui/Dialog'
import { Textarea } from '@/components/ui/Textarea'
import { Label } from '@/components/ui/Label'

type WorkflowVersionPanelProps = ComponentProps<typeof WorkflowVersionPanel>

interface VersionPanelProps extends WorkflowVersionPanelProps {
  isOpen: boolean
}

interface SaveVersionDialogProps {
  open: boolean
  onClose: () => void
  versionName: string
  versionChangeSummary: string
  onVersionNameChange: (value: string) => void
  onVersionChangeSummaryChange: (value: string) => void
  onSave: () => void
  isSaving: boolean
}

export function VersionPanel({ isOpen, ...props }: VersionPanelProps) {
  return (
    <AnimatePresence>
      {isOpen && <WorkflowVersionPanel {...props} />}
    </AnimatePresence>
  )
}

export function SaveVersionDialog({
  open,
  onClose,
  versionName,
  versionChangeSummary,
  onVersionNameChange,
  onVersionChangeSummaryChange,
  onSave,
  isSaving,
}: SaveVersionDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title="Save New Version" size="sm">
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label>Version Name (optional)</Label>
          <input
            type="text"
            value={versionName}
            onChange={(e) => onVersionNameChange(e.target.value)}
            placeholder="e.g., Bug fix for authentication"
            className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="space-y-2">
          <Label>Change Summary</Label>
          <Textarea
            value={versionChangeSummary}
            onChange={(e) => onVersionChangeSummaryChange(e.target.value)}
            placeholder="Describe what changed in this version..."
            rows={3}
          />
        </div>
      </div>
      <DialogFooter>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-md bg-secondary text-foreground/80 text-sm font-medium hover:bg-secondary/80 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={isSaving}
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
          Save Version
        </button>
      </DialogFooter>
    </Dialog>
  )
}
