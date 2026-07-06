/**
 * WorkflowService Implementation
 *
 * Domain service handling all WorkflowTemplate-related operations.
 * Depends on WorkflowRepository for data access — no DatabaseService facade.
 */

import type { WorkflowRepository } from '../../repositories/workflow-repository.js'
import type { WorkflowTemplate, WorkflowVersion, CreateWorkflowTemplate, UpdateWorkflowTemplate, CreateWorkflowVersion } from '../../database/types.js'
import type { IWorkflowService } from './interfaces/index.js'

export class WorkflowService implements IWorkflowService {
  constructor(private readonly workflowRepo: WorkflowRepository) {}

  async getById(id: string, ownerId?: string): Promise<WorkflowTemplate | null> {
    return this.workflowRepo.getTemplateById(id, ownerId)
  }

  async getAll(ownerId?: string): Promise<WorkflowTemplate[]> {
    return this.workflowRepo.getAllTemplates(ownerId)
  }

  async getPaginated(page: number, limit: number, ownerId?: string): Promise<{ templates: WorkflowTemplate[]; total: number }> {
    const offset = (page - 1) * limit
    return this.workflowRepo.getTemplatesPaginated({ ownerId, limit, offset })
  }

  async getMarked(ownerId?: string): Promise<WorkflowTemplate[]> {
    return this.workflowRepo.getPublicTemplates(ownerId)
  }

  async create(data: CreateWorkflowTemplate, ownerId?: string): Promise<WorkflowTemplate> {
    return this.workflowRepo.createTemplate({
      name: data.name,
      description: data.description,
      nodes_json: data.nodes_json,
      edges_json: data.edges_json,
      is_public: data.is_public,
    }, ownerId)
  }

  async update(id: string, data: UpdateWorkflowTemplate, ownerId?: string): Promise<WorkflowTemplate | null> {
    return this.workflowRepo.updateTemplate(id, data, ownerId)
  }

  async delete(id: string, ownerId?: string): Promise<void> {
    const deleted = await this.workflowRepo.deleteTemplate(id, ownerId)
    if (!deleted) {
      throw new Error(`WorkflowTemplate not found: ${id}`)
    }
  }

  async getVersions(templateId: string): Promise<WorkflowVersion[]> {
    return this.workflowRepo.getVersionsByTemplate(templateId)
  }

  async getActiveVersion(templateId: string): Promise<WorkflowVersion | null> {
    const result = await this.workflowRepo.getActiveVersion(templateId)
    return result ?? null
  }

  async createVersion(data: CreateWorkflowVersion): Promise<WorkflowVersion> {
    return this.workflowRepo.createVersion(data)
  }

  async activateVersion(versionId: string): Promise<WorkflowVersion | null> {
    const version = await this.workflowRepo.getVersionById(versionId)
    if (!version) {
      return null
    }
    await this.workflowRepo.activateVersion(versionId, version.template_id)
    const updated = await this.workflowRepo.getVersionById(versionId)
    return updated ?? null
  }

  async deleteVersion(versionId: string): Promise<void> {
    const version = await this.workflowRepo.getVersionById(versionId)
    if (!version) {
      throw new Error(`WorkflowVersion not found: ${versionId}`)
    }
    await this.workflowRepo.deleteVersion(versionId)
  }
}