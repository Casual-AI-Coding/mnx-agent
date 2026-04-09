import { status } from '@/themes/tokens'
import { cn } from '@/lib/utils'

export function getDifficultyLabel(difficulty: string): string {
  const labels: Record<string, string> = {
    beginner: '入门',
    intermediate: '进阶',
    advanced: '高级',
  }
  return labels[difficulty] || difficulty
}

export function getDifficultyColor(difficulty: string): string {
  const colors: Record<string, string> = {
    beginner: cn(status.success.bgSubtle, status.success.icon),
    intermediate: cn(status.warning.bgSubtle, status.warning.icon),
    advanced: cn(status.error.bgSubtle, status.error.icon),
  }
  return colors[difficulty] || cn(status.pending.bgSubtle, status.pending.icon)
}

export function getNodeCount(template: { nodes: unknown[] }): number {
  return template.nodes.length
}
