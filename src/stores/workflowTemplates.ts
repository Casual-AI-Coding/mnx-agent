export { createTemplateStore, type TemplateStoreState, type TemplateStoreConfig } from './templates'

import { createTemplateStore } from './templates'
import type { WorkflowTemplate, CreateWorkflowDTO, UpdateWorkflowDTO } from '@/lib/api/workflows'
import { listWorkflows, getWorkflow, createWorkflow, updateWorkflow, deleteWorkflow } from '@/lib/api/workflows'

export const useWorkflowTemplatesStore = createTemplateStore<WorkflowTemplate>({
  name: 'workflow-templates',
  listApi: (params) => listWorkflows(params as Parameters<typeof listWorkflows>[0]),
  getApi: getWorkflow,
  createApi: createWorkflow,
  updateApi: updateWorkflow,
  deleteApi: deleteWorkflow,
  listKey: 'workflows',
})

export type { WorkflowTemplate, CreateWorkflowDTO, UpdateWorkflowDTO }
