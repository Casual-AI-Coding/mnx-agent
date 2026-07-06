/**
 * TemplateService — PromptTemplate domain service wrapper
 *
 * Thin wrapper around PromptTemplateRepository.
 * Replaces DatabaseService.getPromptTemplateXxx() proxy methods.
 */

import type { PromptTemplateRepository } from '../repositories/prompt-template-repository.js'
import type {
  PromptTemplate,
  CreatePromptTemplate,
  UpdatePromptTemplate,
  PromptTemplateVersion,
  PromptTemplateVersionDiff,
} from '../database/types.js'

export class TemplateService {
  constructor(private readonly repo: PromptTemplateRepository) {}

  async getTemplates(options: {
    category?: string
    limit: number
    offset: number
    ownerId?: string
  }): Promise<{ items: PromptTemplate[]; total: number }> {
    return this.repo.list({ category: options.category, limit: options.limit, offset: options.offset, ownerId: options.ownerId })
  }

  async getById(id: string, ownerId?: string): Promise<PromptTemplate | null> {
    return this.repo.getById(id, ownerId)
  }

  async getVersions(templateId: string, ownerId: string): Promise<PromptTemplateVersion[]> {
    return this.repo.getVersionsByTemplate(templateId, ownerId)
  }

  async createVersion(templateId: string, ownerId: string, changeSummary?: string | null): Promise<PromptTemplateVersion> {
    return this.repo.createVersion(templateId, ownerId, changeSummary)
  }

  async compareVersions(
    templateId: string,
    fromVersion: number,
    toVersion: number,
    ownerId: string,
  ): Promise<PromptTemplateVersionDiff[]> {
    return this.repo.compareVersions(templateId, fromVersion, toVersion, ownerId)
  }

  async rollback(templateId: string, versionId: string, ownerId: string): Promise<PromptTemplate | null> {
    return this.repo.updateFromVersion(templateId, versionId, ownerId)
  }

  async create(data: CreatePromptTemplate, ownerId?: string): Promise<PromptTemplate> {
    return this.repo.create(data, ownerId)
  }

  async update(id: string, data: UpdatePromptTemplate, ownerId?: string): Promise<PromptTemplate | null> {
    return this.repo.update(id, data, ownerId)
  }

  async delete(id: string, ownerId?: string): Promise<boolean> {
    return this.repo.delete(id, ownerId)
  }
}
