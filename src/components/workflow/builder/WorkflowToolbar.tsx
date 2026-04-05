import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wrench,
  Save,
  Upload,
  Download,
  CheckCircle,
  Trash2,
  Undo,
  Redo,
  Play,
  Pause,
  Tag,
  History,
  Bug,
  Server,
  Loader2,
} from 'lucide-react'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import type { WorkflowVersion } from '@/lib/api/workflows'
import { cn } from '@/lib/utils'

interface WorkflowToolbarProps {
  onSave: () => void
  onSaveToServer: () => void
  onLoad: () => void
  onLoadFromServer: () => void
  onValidate: () => void
  onClear: () => void
  onUndo: () => void
  onRedo: () => void
  onSaveVersion: () => void
  onToggleVersionPanel: () => void
  onTestRun?: () => void
  canUndo: boolean
  canRedo: boolean
  isValid: boolean
  nodeCount: number
  edgeCount: number
  isSaving: boolean
  validationSummary?: { total: number; errors: number; warnings: number }
  currentTemplateId?: string
  versions: WorkflowVersion[]
  activeVersion: WorkflowVersion | null
  onVersionChange: (versionId: string) => void
  isLoadingVersions: boolean
  hasWorkflowId: boolean
}

export function WorkflowToolbar({
  onSave,
  onSaveToServer,
  onLoad,
  onLoadFromServer,
  onValidate,
  onClear,
  onUndo,
  onRedo,
  onSaveVersion,
  onToggleVersionPanel,
  onTestRun,
  canUndo,
  canRedo,
  isValid,
  nodeCount,
  edgeCount,
  isSaving,
  validationSummary,
  currentTemplateId,
  versions,
  activeVersion,
  onVersionChange,
  isLoadingVersions,
  hasWorkflowId,
}: WorkflowToolbarProps) {
  return (
    <div className="h-14 bg-muted/30 border-b border-border flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Wrench className="w-5 h-5 text-primary" />
          Workflow Builder
        </h2>
        <span className="text-xs text-muted-foreground/70">
          {nodeCount} nodes, {edgeCount} edges
        </span>
        {validationSummary && validationSummary.total > 0 && (
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-full font-medium',
            validationSummary.errors > 0
              ? 'bg-destructive/20 text-destructive'
              : 'bg-yellow-500/20 text-yellow-400'
          )}>
            {validationSummary.errors > 0 && `${validationSummary.errors} error${validationSummary.errors !== 1 ? 's' : ''}`}
            {validationSummary.errors > 0 && validationSummary.warnings > 0 && ', '}
            {validationSummary.warnings > 0 && `${validationSummary.warnings} warning${validationSummary.warnings !== 1 ? 's' : ''}`}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className={cn(
            'flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm font-medium transition-colors',
            canUndo
              ? 'bg-secondary text-foreground/80 hover:bg-secondary/80'
              : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
          )}
        >
          <Undo className="w-4 h-4" />
          <span className="hidden sm:inline">Undo</span>
        </button>

        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          className={cn(
            'flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm font-medium transition-colors',
            canRedo
              ? 'bg-secondary text-foreground/80 hover:bg-secondary/80'
              : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
          )}
        >
          <Redo className="w-4 h-4" />
          <span className="hidden sm:inline">Redo</span>
        </button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Version Selector - only show when a workflow is loaded */}
        {currentTemplateId && (
          <>
            <Select 
              value={activeVersion?.id || ''} 
              onValueChange={onVersionChange}
            >
              <SelectTrigger className="w-48 h-8 text-xs">
                <SelectValue placeholder={isLoadingVersions ? 'Loading...' : 'Select version'} />
              </SelectTrigger>
              <SelectContent>
                {versions.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    <div className="flex items-center gap-2">
                      <span>v{v.version_number}</span>
                      {v.is_active && (
                        <span className="text-[10px] bg-green-500/20 text-green-400 px-1 rounded">
                          active
                        </span>
                      )}
                    </div>
                    {v.change_summary && (
                      <div className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                        {v.change_summary}
                      </div>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <button
              onClick={onSaveVersion}
              disabled={!isValid}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm font-medium transition-colors',
                isValid
                  ? 'bg-secondary text-foreground/80 hover:bg-secondary/80'
                  : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
              )}
            >
              <Tag className="w-4 h-4" />
              <span className="hidden sm:inline">Save Version</span>
            </button>

            <button
              onClick={onToggleVersionPanel}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm font-medium bg-secondary text-foreground/80 hover:bg-secondary/80 transition-colors"
            >
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">History</span>
            </button>

            <div className="w-px h-6 bg-border mx-1" />
          </>
        )}

        <button
          onClick={onValidate}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
            isValid
              ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
              : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
          )}
        >
          <CheckCircle className="w-4 h-4" />
          Validate
        </button>

        <button
          onClick={onTestRun}
          disabled={!hasWorkflowId}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
            hasWorkflowId
              ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
              : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
          )}
          title={hasWorkflowId ? '运行测试' : '请先保存工作流'}
        >
          <Bug className="w-4 h-4" />
          测试运行
        </button>

        <button
          onClick={onSaveToServer}
          disabled={isSaving || !isValid}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
            isValid
              ? 'bg-primary text-white hover:bg-primary/90'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          )}
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Server className="w-4 h-4" />}
          Save to Server
        </button>

        <button
          onClick={onLoadFromServer}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-primary-500/20 text-primary-400 hover:bg-primary-500/30 transition-colors"
        >
          <Download className="w-4 h-4" />
          Load from Server
        </button>

        <button
          onClick={onSave}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
        >
          <Save className="w-4 h-4" />
          Export
        </button>

        <button
          onClick={onLoad}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-secondary text-foreground/80 hover:bg-secondary/80 transition-colors"
        >
          <Upload className="w-4 h-4" />
          Import
        </button>

        <button
          onClick={onClear}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Clear
        </button>
      </div>
    </div>
  )
}
