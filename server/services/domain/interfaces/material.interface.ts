import type {
  Material,
  CreateMaterial,
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
  materialType?: string
  limit: number
  offset: number
}

export interface MaterialQueryResult {
  records: Material[]
  total: number
}

export type MaterialDetailResult = MaterialDetailResultType

export interface IMaterialService {
  getById(id: string, ownerId?: string): Promise<Material | null>
  list(filter: MaterialFilter): Promise<MaterialQueryResult>
  create(data: CreateMaterial, ownerId?: string): Promise<Material>
  update(id: string, data: Partial<Material>, ownerId?: string): Promise<Material | null>
  softDelete(id: string, ownerId?: string): Promise<boolean>
  getMaterialDetail(id: string, ownerId?: string): Promise<MaterialDetailResult | null>
  createMaterialItem(data: CreateMaterialItem, ownerId?: string): Promise<MaterialItem>
  updateMaterialItem(id: string, data: UpdateMaterialItem, ownerId?: string): Promise<MaterialItem | null>
  softDeleteMaterialItem(id: string, ownerId?: string): Promise<boolean>
  createPrompt(data: CreatePromptRecord, ownerId?: string): Promise<PromptRecord>
  updatePrompt(id: string, data: UpdatePromptRecord, ownerId?: string): Promise<PromptRecord | null>
  softDeletePrompt(id: string, ownerId?: string): Promise<boolean>
  setDefaultPrompt(id: string, ownerId?: string): Promise<PromptRecord | null>
}
