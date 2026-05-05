import type { ComponentProps } from 'react'
import { WorkflowToolbar } from '@/components/workflow/builder'

type WorkflowToolbarProps = ComponentProps<typeof WorkflowToolbar>

export function Toolbar(props: WorkflowToolbarProps) {
  return <WorkflowToolbar {...props} />
}
