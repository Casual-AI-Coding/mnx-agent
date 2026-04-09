/**
 * WorkflowService Implementation
 *
 * Domain service handling all WorkflowTemplate-related operations.
 * Delegates to DatabaseService for data access.
 */

import type { DatabaseService } from '../../database/service-async.js'
import type { WorkflowTemplate, WorkflowVersion, CreateWorkflowTemplate, UpdateWorkflowTemplate, CreateWorkflowVersion } from '../../database/types.js'
import type { IWorkflowService } from './interfaces/index.js'

export class WorkflowService implements IWorkflowService {
  constructor(private readonly db: DatabaseService) {}

  async getById(id: string, ownerId?: string): Promise<WorkflowTemplate | null> {
    return this.db.getWorkflowTemplateById(id, ownerId)
  }

  async getAll(ownerId?: string): Promise<WorkflowTemplate[]> {
    return this.db.getAllWorkflowTemplates(ownerId)
  }

  async getPaginated(page: number, limit: number, ownerId?: string): Promise<{ templates: WorkflowTemplate[]; total: number }> {
    const offset = (page - 1) * limit
    return this.db.getWorkflowTemplatesPaginated({ ownerId, limit, offset })
  }

  async getMarked(ownerId?: string): Promise<WorkflowTemplate[]> {
    return this.db.getMarkedWorkflowTemplates(ownerId)
  }

  async create(data: CreateWorkflowTemplate, ownerId?: string): Promise<WorkflowTemplate> {
    return this.db.createWorkflowTemplate({
      name: data.name,
      description: data.description,
      nodes_json: data.nodes_json,
      edges_json: data.edges_json,
      is_public: data.is_public,
    }, ownerId)
  }

  async update(id: string, data: UpdateWorkflowTemplate, ownerId?: string): Promise<WorkflowTemplate | null> {
    return this.db.updateWorkflowTemplate(id, data, ownerId)
  }

  async delete(id: string, ownerId?: string): Promise<void> {
    const deleted = await this.db.deleteWorkflowTemplate(id, ownerId)
    if (!deleted) {
      throw new Error(`WorkflowTemplate not found: ${id}`)
    }
  }

  async getVersions(templateId: string): Promise<WorkflowVersion[]> {
    return this.db.getWorkflowVersionsByTemplate(templateId)
  }

  async getActiveVersion(templateId: string): Promise<WorkflowVersion | null> {
    const result = await this.db.getActiveWorkflowVersion(templateId)
    return result ?? null
  }

  async createVersion(data: CreateWorkflowVersion): Promise<WorkflowVersion> {
    return this.db.createWorkflowVersion(data)
  }

  async activateVersion(versionId: string): Promise<WorkflowVersion | null> {
    const version = await this.db.getWorkflowVersionById(versionId)
    if (!version) {
      return null
    }
    await this.db.activateWorkflowVersion(versionId, version.template_id)
    const updated = await this.db.getWorkflowVersionById(versionId)
    return updated ?? null
  }

  async deleteVersion(versionId: string): Promise<void> {
    const version = await this.db.getWorkflowVersionById(versionId)
    if (!version) {
      throw new Error(`WorkflowVersion not found: ${versionId}`)
    }
    await this.db.deleteWorkflowVersion(versionId)
  }
}