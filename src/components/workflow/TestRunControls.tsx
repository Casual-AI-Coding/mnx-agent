import { Play, Loader2, ChevronDown, ChevronUp, Pause, X, AlertCircle, Activity, Bug } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { taskStatus } from '@/themes/tokens'

interface TestRunControlsProps {
  isRunning: boolean
  isDryRun: boolean
  isSubscribed: boolean
  showConfig: boolean
  onRun: () => void
  onDryRun: () => void
  onCancel: () => void
  onToggleConfig: () => void
}

export function TestRunControls({
  isRunning,
  isDryRun,
  isSubscribed,
  showConfig,
  onRun,
  onDryRun,
  onCancel,
  onToggleConfig,
}: TestRunControlsProps) {
  return (
    <>
      {/* Run buttons */}
      <div className="flex gap-2">
        <button
          onClick={onRun}
          disabled={isRunning}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md',
            'text-sm font-medium transition-colors',
            isRunning && !isDryRun
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : cn(taskStatus.completed.bg.replace('/10', '/20'), taskStatus.completed.text, 'hover:', taskStatus.completed.bg.replace('/10', '/30'))
          )}
        >
          {isRunning && !isDryRun ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          {isRunning ? '执行中...' : '运行测试'}
        </button>
        <button
          onClick={onDryRun}
          disabled={isRunning}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
            isRunning && isDryRun
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : 'bg-secondary text-foreground/80 hover:bg-secondary/80'
          )}
        >
          {isRunning && isDryRun ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Bug className="w-4 h-4" />
          )}
          模拟
        </button>
        {isRunning && (
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors"
            title="取消执行"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={onToggleConfig}
          className={cn(
            'px-3 py-2 rounded-md border text-sm font-medium transition-colors',
            showConfig
              ? 'bg-primary/10 border-primary/30 text-primary'
              : 'border-border text-muted-foreground hover:bg-muted/50'
          )}
          title="测试数据配置"
        >
          {showConfig ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Cancel button bar when running */}
      {isRunning && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn('flex items-center justify-between p-3 border rounded-lg', taskStatus.running.bg, taskStatus.running.border)}
        >
          <div className="flex items-center gap-2">
            <Loader2 className={cn('w-4 h-4 animate-spin', taskStatus.running.dot)} />
            <span className={cn('text-sm', taskStatus.running.text)}>执行中...</span>
            {isSubscribed ? (
              <span className={cn('text-[10px] flex items-center gap-1', taskStatus.completed.text)}>
                <Activity className={cn('w-3 h-3', taskStatus.completed.dot)} />
                实时更新
              </span>
            ) : (
              <span className={cn('text-[10px] flex items-center gap-1', taskStatus.pending.text)}>
                <AlertCircle className={cn('w-3 h-3', taskStatus.pending.dot)} />
                未连接
              </span>
            )}
          </div>
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors"
          >
            <Pause className="w-3 h-3" />
            取消执行
          </button>
        </motion.div>
      )}
    </>
  )
}
