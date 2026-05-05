import type { ComponentProps } from 'react'
import { SaveWorkflowModal } from '@/components/workflow/SaveWorkflowModal'
import { WorkflowSelectorModal } from '@/components/workflow/TemplateSelectorModal'
import { SaveVersionDialog, VersionPanel } from './VersionPanels.js'

type SaveWorkflowModalProps = ComponentProps<typeof SaveWorkflowModal>
type WorkflowSelectorModalProps = ComponentProps<typeof WorkflowSelectorModal>
type VersionPanelProps = ComponentProps<typeof VersionPanel>
type SaveVersionDialogProps = ComponentProps<typeof SaveVersionDialog>

interface WorkflowDialogsProps {
  saveWorkflowModalProps: SaveWorkflowModalProps
  templateSelectorModalProps: WorkflowSelectorModalProps
  workflowSelectorModalProps: WorkflowSelectorModalProps
  versionPanelProps: VersionPanelProps
  saveVersionDialogProps: SaveVersionDialogProps
}

export function WorkflowDialogs({
  saveWorkflowModalProps,
  templateSelectorModalProps,
  workflowSelectorModalProps,
  versionPanelProps,
  saveVersionDialogProps,
}: WorkflowDialogsProps) {
  return (
    <>
      <SaveWorkflowModal {...saveWorkflowModalProps} />
      <WorkflowSelectorModal {...templateSelectorModalProps} />
      <WorkflowSelectorModal {...workflowSelectorModalProps} />
      <VersionPanel {...versionPanelProps} />
      <SaveVersionDialog {...saveVersionDialogProps} />
    </>
  )
}
