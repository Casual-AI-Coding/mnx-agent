import type { ComponentProps } from 'react'
import { AnimatePresence } from 'framer-motion'
import { WorkflowConfigPanel } from '@/components/workflow/builder'

type WorkflowConfigPanelProps = ComponentProps<typeof WorkflowConfigPanel>

interface ConfigPanelProps extends WorkflowConfigPanelProps {
  isOpen: boolean
}

export function ConfigPanel({ isOpen, ...props }: ConfigPanelProps) {
  return (
    <AnimatePresence>
      {isOpen && <WorkflowConfigPanel {...props} />}
    </AnimatePresence>
  )
}
