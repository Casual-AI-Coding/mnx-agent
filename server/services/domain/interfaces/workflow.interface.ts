/**
 * WorkflowService Domain Interface
 *
 * Defines the contract for all WorkflowTemplate-related operations.
 */

import type { WorkflowTemplate, WorkflowVersion, CreateWorkflowTemplate, UpdateWorkflowTemplate, CreateWorkflowVersion } from '../../../database/types.js'

export interface IWorkflowService {
  /**
   * Get a single workflow template by ID
   */
  getById(id: string, ownerId?: string): Promise<WorkflowTemplate | null>

  /**
   * Get all workflow templates, optionally filtered by owner
   */
  getAll(ownerId?: string): Promise<WorkflowTemplate[]>

  /**
   * Get workflow templates with pagination
   */
  getPaginated(page: number, limit: number, ownerId?: string): Promise<{ templates: WorkflowTemplate[]; total: number }>

  /**
   * Get marked (public) workflow templates
   */
  getMarked(ownerId?: string): Promise<WorkflowTemplate[]>

  /**
   * Create a new workflow template
   */
  create(data: CreateWorkflowTemplate, ownerId?: string): Promise<WorkflowTemplate>

  /**
   * Update an existing workflow template
   */
  update(id: string, data: UpdateWorkflowTemplate, ownerId?: string): Promise<WorkflowTemplate | null>

  /**
   * Delete a workflow template
   */
  delete(id: string, ownerId?: string): Promise<void>

  /**
   * Get all versions for a workflow template
   */
  getVersions(templateId: string): Promise<WorkflowVersion[]>

  /**
   * Get the active version for a workflow template
   */
  getActiveVersion(templateId: string): Promise<WorkflowVersion | null>

  /**
   * Create a new workflow version
   */
  createVersion(data: CreateWorkflowVersion): Promise<WorkflowVersion>

  /**
   * Activate a workflow version
   */
  activateVersion(versionId: string): Promise<WorkflowVersion | null>

  /**
   * Delete a workflow version
   */
  deleteVersion(versionId: string): Promise<void>
}
