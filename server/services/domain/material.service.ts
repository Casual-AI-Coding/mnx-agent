import type { DatabaseService } from '../../database/service-async.js'
import type {
  IMaterialService,
  MaterialFilter,
  MaterialQueryResult,
  MaterialDetailResult,
  ReorderMaterialItemInput,
  ReorderPromptsRequest,
} from './interfaces/material.interface.js'
import type {
  Material,
  CreateMaterial,
  UpdateMaterial,
  MaterialItem,
  CreateMaterialItem,
  UpdateMaterialItem,
  PromptRecord,
  CreatePromptRecord,
  UpdatePromptRecord,
} from '../../database/types.js'

export class MaterialService implements IMaterialService {
  constructor(private readonly db: DatabaseService) {}

  async getById(id: string, ownerId?: string): Promise<Material | null> {
    return this.db.getMaterialById(id, ownerId)
  }

  async list(filter: MaterialFilter): Promise<MaterialQueryResult> {
    const limit = filter.limit ?? 20
    const offset = filter.offset ?? 0
    return this.db.getMaterials({
      ownerId: filter.ownerId,
      materialType: filter.materialType as 'artist' | undefined,
      limit,
      offset,
    })
  }

  async create(data: CreateMaterial, ownerId?: string): Promise<Material> {
    return this.db.createMaterial(data, ownerId)
  }

  async update(id: string, data: UpdateMaterial, ownerId?: string): Promise<Material | null> {
    const updateData: UpdateMaterial = {}
    if (data.name !== undefined) {
      updateData.name = data.name
    }
    if (data.description !== undefined) {
      updateData.description = data.description
    }
    if (data.metadata !== undefined) {
      updateData.metadata = data.metadata
    }
    return this.db.updateMaterial(id, updateData, ownerId)
  }

  async softDelete(id: string, ownerId?: string): Promise<boolean> {
    return this.db.softDeleteMaterial(id, ownerId)
  }

  async getMaterialDetail(id: string, ownerId?: string): Promise<MaterialDetailResult | null> {
    return this.db.getMaterialDetail(id, ownerId)
  }

  async createMaterialItem(data: CreateMaterialItem, ownerId?: string): Promise<MaterialItem> {
    return this.db.createMaterialItem(data, ownerId)
  }

  async updateMaterialItem(id: string, data: UpdateMaterialItem, ownerId?: string): Promise<MaterialItem | null> {
    return this.db.updateMaterialItem(id, data, ownerId)
  }

  async softDeleteMaterialItem(id: string, ownerId?: string): Promise<boolean> {
    return this.db.softDeleteMaterialItem(id, ownerId)
  }

  async reorderMaterialItems(materialId: string, items: ReorderMaterialItemInput[], ownerId?: string): Promise<void> {
    return this.db.reorderMaterialItems(materialId, items, ownerId)
  }

  async createPrompt(data: CreatePromptRecord, ownerId?: string): Promise<PromptRecord> {
    return this.db.createPrompt(data, ownerId)
  }

  async updatePrompt(id: string, data: UpdatePromptRecord, ownerId?: string): Promise<PromptRecord | null> {
    return this.db.updatePrompt(id, data, ownerId)
  }

  async softDeletePrompt(id: string, ownerId?: string): Promise<boolean> {
    return this.db.softDeletePrompt(id, ownerId)
  }

  async setDefaultPrompt(id: string, ownerId?: string): Promise<PromptRecord | null> {
    return this.db.setDefaultPrompt(id, ownerId)
  }

  async reorderPrompts(request: ReorderPromptsRequest, ownerId?: string): Promise<void> {
    return this.db.reorderPrompts(request, ownerId)
  }
}
