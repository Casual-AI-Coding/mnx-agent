import type {
  IMaterialService,
  MaterialFilter,
  MaterialQueryResult,
  MaterialDetailResult,
  PromptTargetFilter,
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
import type { MaterialRepository } from '../../repositories/material-repository.js'
import type { MaterialItemRepository } from '../../repositories/material-item-repository.js'
import type { PromptRepository } from '../../repositories/prompt-repository.js'

export class MaterialService implements IMaterialService {
  constructor(
    private readonly materialRepo: MaterialRepository,
    private readonly materialItemRepo: MaterialItemRepository,
    private readonly promptRepo: PromptRepository,
  ) {}

  async getById(id: string, ownerId?: string): Promise<Material | null> {
    return this.materialRepo.getById(id, ownerId)
  }

  async list(filter: MaterialFilter): Promise<MaterialQueryResult> {
    const result = await this.materialRepo.listWithItemCount({
      ownerId: filter.ownerId,
      materialType: filter.materialType as Material['material_type'] | undefined,
      limit: filter.limit ?? 20,
      offset: filter.offset ?? 0,
    })
    return { records: result.items, total: result.total }
  }

  async create(data: CreateMaterial, ownerId?: string): Promise<Material> {
    return this.materialRepo.create({ ...data, ownerId: ownerId ?? '' })
  }

  async update(id: string, data: UpdateMaterial, ownerId?: string): Promise<Material | null> {
    if (!ownerId) throw new Error('ownerId is required for updateMaterial')
    return this.materialRepo.update(id, data, ownerId)
  }

  async softDelete(id: string, ownerId?: string): Promise<boolean> {
    if (!ownerId) throw new Error('ownerId is required for softDeleteMaterial')
    return this.materialRepo.softDelete(id, ownerId)
  }

  async getMaterialDetail(id: string, ownerId?: string): Promise<MaterialDetailResult | null> {
    const material = await this.materialRepo.getById(id, ownerId)
    if (!material) return null

    if (!ownerId) {
      throw new Error('ownerId is required for getMaterialDetail')
    }

    const items = await this.materialItemRepo.listByMaterial(id, ownerId)
    const materialPrompts = await this.promptRepo.listByTarget({
      targetType: 'material-main',
      targetId: id,
      slotType: 'artist-style',
      ownerId,
    })

    const itemIds = items.map(i => i.id)
    const allItemPrompts = itemIds.length > 0
      ? await this.promptRepo.listByTargetIds('material-item', itemIds, 'song-style', ownerId)
      : []

    const promptsByItemId = new Map<string, PromptRecord[]>()
    for (const prompt of allItemPrompts) {
      const list = promptsByItemId.get(prompt.target_id)
      if (list) { list.push(prompt) } else { promptsByItemId.set(prompt.target_id, [prompt]) }
    }

    return {
      material,
      materialPrompts,
      items: items.map(item => ({ ...item, prompts: promptsByItemId.get(item.id) ?? [] })),
    }
  }

  async createMaterialItem(data: CreateMaterialItem, ownerId?: string): Promise<MaterialItem> {
    if (ownerId) {
      const parentMaterial = await this.materialRepo.getById(data.material_id, ownerId)
      if (!parentMaterial) {
        const error = new Error('Material not found or access denied') as Error & { code?: number }
        error.code = 403
        throw error
      }
    }
    return this.materialItemRepo.create({ ...data, ownerId: ownerId ?? '' })
  }

  async updateMaterialItem(id: string, data: UpdateMaterialItem, ownerId?: string): Promise<MaterialItem | null> {
    if (!ownerId) throw new Error('ownerId is required for updateMaterialItem')
    return this.materialItemRepo.update(id, data, ownerId)
  }

  async softDeleteMaterialItem(id: string, ownerId?: string): Promise<boolean> {
    if (!ownerId) throw new Error('ownerId is required for softDeleteMaterialItem')
    return this.materialItemRepo.softDelete(id, ownerId)
  }

  async reorderMaterialItems(materialId: string, items: ReorderMaterialItemInput[], ownerId?: string): Promise<void> {
    if (!ownerId) throw new Error('ownerId is required for reorderMaterialItems')
    return this.materialItemRepo.reorder(materialId, items, ownerId)
  }

  async listPrompts(filter: PromptTargetFilter, ownerId?: string): Promise<PromptRecord[]> {
    if (!ownerId) throw new Error('ownerId is required for listPrompts')
    return this.promptRepo.listByTarget({
      targetType: filter.target_type,
      targetId: filter.target_id,
      slotType: filter.slot_type,
      ownerId,
    })
  }

  async createPrompt(data: CreatePromptRecord, ownerId?: string): Promise<PromptRecord> {
    return this.promptRepo.create({
      targetType: data.target_type,
      targetId: data.target_id,
      slotType: data.slot_type,
      name: data.name,
      content: data.content,
      ownerId: ownerId ?? '',
      sortOrder: data.sort_order,
      isDefault: data.is_default,
    })
  }

  async updatePrompt(id: string, data: UpdatePromptRecord, ownerId?: string): Promise<PromptRecord | null> {
    if (!ownerId) throw new Error('ownerId is required for updatePrompt')
    return this.promptRepo.update(id, data, ownerId)
  }

  async softDeletePrompt(id: string, ownerId?: string): Promise<boolean> {
    if (!ownerId) throw new Error('ownerId is required for softDeletePrompt')
    return this.promptRepo.softDelete(id, ownerId)
  }

  async setDefaultPrompt(id: string, ownerId?: string): Promise<PromptRecord | null> {
    if (!ownerId) throw new Error('ownerId is required for setDefaultPrompt')
    return this.promptRepo.setDefault(id, ownerId)
  }

  async reorderPrompts(request: ReorderPromptsRequest, ownerId?: string): Promise<void> {
    if (!ownerId) throw new Error('ownerId is required for reorderPrompts')
    return this.promptRepo.reorder({
      targetType: request.target_type,
      targetId: request.target_id,
      slotType: request.slot_type,
      ownerId,
    }, request.items)
  }
}
