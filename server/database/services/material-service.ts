import type {
  CreateMaterial,
  CreateMaterialItem,
  CreatePromptRecord,
  Material,
  MaterialDetailResult,
  MaterialItem,
  MaterialQueryOptions,
  PromptRecord,
  UpdateMaterial,
  UpdateMaterialItem,
  UpdatePromptRecord,
} from '../types.js'
import type { MaterialItemRepository, MaterialRepository, PromptRepository } from '../../repositories/index.js'

export class MaterialService {
  constructor(
    private readonly materialRepo: MaterialRepository,
    private readonly materialItemRepo: MaterialItemRepository,
    private readonly promptRepo: PromptRepository,
  ) {}

  async getMaterialById(id: string, ownerId?: string): Promise<Material | null> {
    return this.materialRepo.getById(id, ownerId)
  }

  async getMaterials(options: MaterialQueryOptions): Promise<{ records: Material[]; total: number }> {
    const result = await this.materialRepo.listWithItemCount(options)
    return { records: result.items, total: result.total }
  }

  async createMaterial(data: CreateMaterial, ownerId?: string): Promise<Material> {
    return this.materialRepo.create({
      ...data,
      ownerId: ownerId ?? '',
    })
  }

  async updateMaterial(id: string, data: UpdateMaterial, ownerId?: string): Promise<Material | null> {
    if (!ownerId) throw new Error('ownerId is required for updateMaterial')
    return this.materialRepo.update(id, data, ownerId)
  }

  async softDeleteMaterial(id: string, ownerId?: string): Promise<boolean> {
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

    const itemsWithPromises = await Promise.all(
      items.map(async (item) => {
        const itemPrompts = await this.promptRepo.listByTarget({
          targetType: 'material-item',
          targetId: item.id,
          slotType: 'song-style',
          ownerId,
        })

        return { ...item, prompts: itemPrompts }
      })
    )

    return {
      material,
      materialPrompts,
      items: itemsWithPromises,
    }
  }

  async createMaterialItem(data: CreateMaterialItem, ownerId?: string): Promise<MaterialItem> {
    return this.materialItemRepo.create({
      ...data,
      ownerId: ownerId ?? '',
    })
  }

  async updateMaterialItem(id: string, data: UpdateMaterialItem, ownerId?: string): Promise<MaterialItem | null> {
    if (!ownerId) throw new Error('ownerId is required for updateMaterialItem')
    return this.materialItemRepo.update(id, data, ownerId)
  }

  async softDeleteMaterialItem(id: string, ownerId?: string): Promise<boolean> {
    if (!ownerId) throw new Error('ownerId is required for softDeleteMaterialItem')
    return this.materialItemRepo.softDelete(id, ownerId)
  }

  async reorderMaterialItems(
    materialId: string,
    items: Array<{ id: string; sort_order: number }>,
    ownerId?: string
  ): Promise<void> {
    if (!ownerId) throw new Error('ownerId is required for reorderMaterialItems')
    return this.materialItemRepo.reorder(materialId, items, ownerId)
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

  async reorderPrompts(
    request: {
      target_type: PromptRecord['target_type']
      target_id: string
      slot_type: PromptRecord['slot_type']
      items: Array<{ id: string; sort_order: number }>
    },
    ownerId?: string
  ): Promise<void> {
    if (!ownerId) throw new Error('ownerId is required for reorderPrompts')
    return this.promptRepo.reorder({
      targetType: request.target_type,
      targetId: request.target_id,
      slotType: request.slot_type,
      ownerId,
    }, request.items)
  }
}
