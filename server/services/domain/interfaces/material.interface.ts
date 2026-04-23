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
  MaterialDetailResult as MaterialDetailResultType,
} from '../../../database/types.js'

export interface MaterialFilter {
  ownerId: string
  materialType?: Material['material_type']
  limit?: number
  offset?: number
}

export interface MaterialQueryResult {
  records: Material[]
  total: number
}

export type MaterialDetailResult = MaterialDetailResultType

export interface ReorderMaterialItemInput {
  id: string
  sort_order: number
}

export interface ReorderPromptInput {
  id: string
  sort_order: number
}

export interface ReorderPromptsRequest {
  target_type: PromptRecord['target_type']
  target_id: string
  slot_type: PromptRecord['slot_type']
  items: ReorderPromptInput[]
}

export interface IMaterialService {
  getById(id: string, ownerId?: string): Promise<Material | null>
  list(filter: MaterialFilter): Promise<MaterialQueryResult>
  create(data: CreateMaterial, ownerId?: string): Promise<Material>
  update(id: string, data: UpdateMaterial, ownerId?: string): Promise<Material | null>
  softDelete(id: string, ownerId?: string): Promise<boolean>
  getMaterialDetail(id: string, ownerId?: string): Promise<MaterialDetailResult | null>
  createMaterialItem(data: CreateMaterialItem, ownerId?: string): Promise<MaterialItem>
  updateMaterialItem(id: string, data: UpdateMaterialItem, ownerId?: string): Promise<MaterialItem | null>
  softDeleteMaterialItem(id: string, ownerId?: string): Promise<boolean>
  reorderMaterialItems(materialId: string, items: ReorderMaterialItemInput[], ownerId?: string): Promise<void>
  createPrompt(data: CreatePromptRecord, ownerId?: string): Promise<PromptRecord>
  updatePrompt(id: string, data: UpdatePromptRecord, ownerId?: string): Promise<PromptRecord | null>
  softDeletePrompt(id: string, ownerId?: string): Promise<boolean>
  setDefaultPrompt(id: string, ownerId?: string): Promise<PromptRecord | null>
  reorderPrompts(request: ReorderPromptsRequest, ownerId?: string): Promise<void>
}
