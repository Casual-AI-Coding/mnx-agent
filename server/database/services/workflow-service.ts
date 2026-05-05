import type {
  CreateWorkflowVersion,
  UpdateWorkflowTemplate,
  WorkflowTemplate,
  WorkflowVersion,
} from '../types.js'
import type { WorkflowRepository } from '../../repositories/index.js'

export class WorkflowService {
  constructor(private readonly workflowRepo: WorkflowRepository) {}

  async getAllWorkflowTemplates(ownerId?: string): Promise<WorkflowTemplate[]> {
    return this.workflowRepo.getAllTemplates(ownerId)
  }

  async getWorkflowTemplatesPaginated(options: {
    ownerId?: string
    isTemplate?: boolean
    limit?: number
    offset?: number
  }): Promise<{ templates: WorkflowTemplate[]; total: number }> {
    return this.workflowRepo.getTemplatesPaginated(options)
  }

  async getWorkflowTemplateById(id: string, ownerId?: string): Promise<WorkflowTemplate | null> {
    return this.workflowRepo.getTemplateById(id, ownerId)
  }

  async createWorkflowTemplate(template: { name: string; description?: string | null; nodes_json: string; edges_json: string; is_public?: boolean }, ownerId?: string): Promise<WorkflowTemplate> {
    return this.workflowRepo.createTemplate(template, ownerId)
  }

  async updateWorkflowTemplate(id: string, updates: UpdateWorkflowTemplate, ownerId?: string): Promise<WorkflowTemplate | null> {
    return this.workflowRepo.updateTemplate(id, updates, ownerId)
  }

  async deleteWorkflowTemplate(id: string, ownerId?: string): Promise<boolean> {
    return this.workflowRepo.deleteTemplate(id, ownerId)
  }

  async getMarkedWorkflowTemplates(ownerId?: string): Promise<WorkflowTemplate[]> {
    return this.workflowRepo.getPublicTemplates(ownerId)
  }

  async createWorkflowPermission(data: {
    workflow_id: string
    user_id: string
    granted_by?: string | null
  }): Promise<void> {
    return this.workflowRepo.createPermission(data)
  }

  async deleteWorkflowPermission(workflowId: string, userId: string): Promise<void> {
    return this.workflowRepo.deletePermission(workflowId, userId)
  }

  async hasWorkflowPermission(workflowId: string, userId: string): Promise<boolean> {
    return this.workflowRepo.hasPermission(workflowId, userId)
  }

  async getWorkflowPermissions(workflowId: string): Promise<Array<{
    id: string
    workflow_id: string
    user_id: string
    granted_by: string | null
    created_at: string
    username: string
    email: string | null
  }>> {
    return this.workflowRepo.getPermissions(workflowId)
  }

  async getAvailableWorkflows(userId: string): Promise<WorkflowTemplate[]> {
    return this.workflowRepo.getAvailableWorkflows(userId)
  }

  async createWorkflowVersion(data: CreateWorkflowVersion): Promise<WorkflowVersion> {
    return this.workflowRepo.createVersion(data)
  }

  async getWorkflowVersionById(id: string): Promise<WorkflowVersion | undefined> {
    return this.workflowRepo.getVersionById(id)
  }

  async getWorkflowVersionsByTemplate(templateId: string): Promise<WorkflowVersion[]> {
    return this.workflowRepo.getVersionsByTemplate(templateId)
  }

  async getActiveWorkflowVersion(templateId: string): Promise<WorkflowVersion | undefined> {
    return this.workflowRepo.getActiveVersion(templateId)
  }

  async getLatestVersionNumber(templateId: string): Promise<number> {
    return this.workflowRepo.getLatestVersionNumber(templateId)
  }

  async activateWorkflowVersion(versionId: string, templateId: string): Promise<void> {
    return this.workflowRepo.activateVersion(versionId, templateId)
  }

  async deleteWorkflowVersion(id: string): Promise<void> {
    return this.workflowRepo.deleteVersion(id)
  }

  async saveTemplateVersion(
    templateId: string,
    nodesJson: string,
    edgesJson: string,
    changeSummary: string | null,
    userId: string | null
  ): Promise<WorkflowVersion> {
    return this.workflowRepo.saveTemplateVersion(templateId, nodesJson, edgesJson, changeSummary, userId)
  }
}
