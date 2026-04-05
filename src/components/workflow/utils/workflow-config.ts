import type { AvailableActionItem } from '@/components/workflow/builder'

/**
 * Get default configuration for a node type
 * @param type - The node type
 * @param actionData - Optional action data for action nodes
 * @returns Default configuration object
 */
export function getDefaultConfig(
  type: string,
  actionData?: AvailableActionItem
): Record<string, unknown> {
  switch (type) {
    case 'action':
      return {
        label: actionData?.label || 'Action',
        config: {
          service: actionData?.service || '',
          method: actionData?.method || '',
          args: [],
        },
      }
    case 'condition':
      return {
        conditionType: 'equals',
        serviceType: 'text',
        threshold: 0,
        label: 'Condition',
      }
    case 'loop':
      return {
        condition: '',
        maxIterations: 100,
        label: 'Loop',
      }
    case 'transform':
      return {
        transformType: 'map',
        mapping: {},
        inputType: '',
        outputType: '',
        label: 'Transform',
      }
    case 'delay':
      return {
        duration: 1000,
        label: 'Delay',
      }
    case 'errorBoundary':
      return {
        label: 'Error Boundary',
      }
    default:
      return { label: type }
  }
}
