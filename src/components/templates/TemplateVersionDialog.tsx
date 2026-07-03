import { useEffect, useState } from 'react'
import { GitCompare, History, RotateCcw, Save } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { toastError, toastSuccess } from '@/lib/toast'
import type { PromptTemplate, PromptTemplateVersion, PromptTemplateVersionDiff } from '@/lib/api/templates'

interface TemplateVersionDialogProps {
  open: boolean
  template: PromptTemplate | null
  versions: PromptTemplateVersion[]
  diffs: PromptTemplateVersionDiff[]
  isLoading: boolean
  onClose: () => void
  onCreateVersion: (templateId: string, changeSummary: string | null) => Promise<boolean>
  onCompareVersions: (templateId: string, from: number, to: number) => Promise<void>
  onRollbackVersion: (templateId: string, versionId: string) => Promise<boolean>
}

export function TemplateVersionDialog({
  open,
  template,
  versions,
  diffs,
  isLoading,
  onClose,
  onCreateVersion,
  onCompareVersions,
  onRollbackVersion,
}: TemplateVersionDialogProps) {
  const [changeSummary, setChangeSummary] = useState('')
  const [fromVersion, setFromVersion] = useState<number | null>(null)
  const [toVersion, setToVersion] = useState<number | null>(null)

  useEffect(() => {
    const latest = versions[0]?.version_number ?? null
    const previous = versions[1]?.version_number ?? latest
    setFromVersion(previous)
    setToVersion(latest)
  }, [versions])

  const handleCreateVersion = async () => {
    if (!template) return
    const trimmedSummary = changeSummary.trim()
    const success = await onCreateVersion(template.id, trimmedSummary.length > 0 ? trimmedSummary : null)
    if (success) {
      setChangeSummary('')
      toastSuccess('版本已创建', `模板 "${template.name}" 已保存新版本`)
      return
    }
    toastError('创建版本失败', '请稍后重试')
  }

  const handleCompareVersions = async () => {
    if (!template || fromVersion === null || toVersion === null) return
    await onCompareVersions(template.id, fromVersion, toVersion)
  }

  const handleRollbackVersion = async (version: PromptTemplateVersion) => {
    if (!template) return
    const success = await onRollbackVersion(template.id, version.id)
    if (success) {
      toastSuccess('回滚成功', `已回滚到 v${version.version_number}`)
      return
    }
    toastError('回滚失败', '请稍后重试')
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="版本管理"
      description={template ? `管理模板 "${template.name}" 的版本历史、对比与回滚` : undefined}
      size="lg"
    >
      <div className="space-y-5 overflow-y-auto px-1 py-4">
        <section className="rounded-xl border border-border bg-card/secondary p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
            <Save className="h-4 w-4 text-primary" />
            保存当前快照
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="flex-1 space-y-1 text-sm text-muted-foreground">
              <span>版本变更摘要</span>
              <Input
                value={changeSummary}
                onChange={(event) => setChangeSummary(event.target.value)}
                placeholder="例如：优化提示词语气"
                disabled={!template || isLoading}
              />
            </label>
            <Button className="self-end" onClick={handleCreateVersion} disabled={!template || isLoading}>
              创建版本
            </Button>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card/secondary p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
            <GitCompare className="h-4 w-4 text-primary" />
            版本对比
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <VersionSelect label="起始版本" value={fromVersion} versions={versions} onChange={setFromVersion} />
            <VersionSelect label="目标版本" value={toVersion} versions={versions} onChange={setToVersion} />
            <Button className="self-end" variant="outline" onClick={handleCompareVersions} disabled={!template || versions.length < 2 || isLoading}>
              比较版本
            </Button>
          </div>
          <DiffList diffs={diffs} />
        </section>

        <section className="rounded-xl border border-border bg-card/secondary p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
            <History className="h-4 w-4 text-primary" />
            版本历史
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : versions.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">暂无版本历史</p>
          ) : (
            <div className="space-y-3">
              {versions.map((version) => (
                <div key={version.id} className="rounded-lg border border-border bg-background/80 p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-foreground">v{version.version_number}</span>
                        {version.is_active && <Badge variant="secondary">当前版本</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{version.change_summary || '未填写变更摘要'}</p>
                      <p className="text-xs text-muted-foreground/70">{formatDate(version.created_at)}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRollbackVersion(version)}
                      disabled={version.is_active || isLoading}
                    >
                      <RotateCcw className="mr-2 h-3.5 w-3.5" />
                      回滚到 v{version.version_number}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </Dialog>
  )
}

function VersionSelect({
  label,
  value,
  versions,
  onChange,
}: {
  label: string
  value: number | null
  versions: PromptTemplateVersion[]
  onChange: (value: number) => void
}) {
  return (
    <label className="space-y-1 text-sm text-muted-foreground">
      <span>{label}</span>
      <select
        aria-label={label}
        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        value={value ?? ''}
        onChange={(event) => onChange(Number(event.target.value))}
        disabled={versions.length === 0}
      >
        {versions.map((version) => (
          <option key={version.id} value={version.version_number}>
            v{version.version_number} · {version.change_summary || version.name}
          </option>
        ))}
      </select>
    </label>
  )
}

function DiffList({ diffs }: { diffs: PromptTemplateVersionDiff[] }) {
  if (diffs.length === 0) {
    return <p className="mt-3 text-sm text-muted-foreground">选择两个版本后查看字段级差异</p>
  }

  return (
    <div className="mt-4 space-y-2">
      {diffs.map((diff) => (
        <div key={diff.field} className="rounded-lg border border-border bg-background/80 p-3">
          <div className="mb-2 text-sm font-medium text-foreground">{diff.field}</div>
          <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
            <DiffValue label="旧值" value={formatDiffValue(diff.from)} tone="muted" />
            <DiffValue label="新值" value={formatDiffValue(diff.to)} tone="primary" />
          </div>
        </div>
      ))}
    </div>
  )
}

function DiffValue({ label, value, tone }: { label: string; value: string; tone: 'muted' | 'primary' }) {
  return (
    <div className="rounded-md bg-muted/20 p-2">
      <div className={tone === 'primary' ? 'mb-1 text-primary' : 'mb-1 text-muted-foreground'}>{label}</div>
      <div className="whitespace-pre-wrap break-words text-foreground">{value}</div>
    </div>
  )
}

function formatDiffValue(value: PromptTemplateVersionDiff['from']): string {
  if (value === null) return '空'
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    return value.map((variable) => `{{${variable.name}}}`).join(', ')
  }
  return value
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', { hour12: false })
}
