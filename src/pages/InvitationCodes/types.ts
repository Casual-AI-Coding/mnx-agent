export interface InvitationCode {
  id: string
  code: string
  created_by: string
  created_by_username: string | null
  max_uses: number
  used_count: number
  expires_at: string | null
  is_active: boolean
  created_at: string
}

export type StatusFilter = 'all' | 'active' | 'used' | 'expired' | 'inactive'
export type SortField = 'created_at' | 'expires_at' | 'used_count'
export type SortOrder = 'asc' | 'desc'

export interface FilterChip {
  id: string
  type: 'search' | 'status'
  label: string
  value: string
}

export interface GenerateFormData {
  count: number
  max_uses: number
  expires_at: string
}

export interface StatCardProps {
  title: string
  value: number
  icon: React.ElementType
  color: string
  compact?: boolean
}

export interface SortButtonProps {
  field: SortField
  currentField: SortField
  order: SortOrder
  onClick: () => void
  children: React.ReactNode
}

export interface InvitationCodeTableProps {
  codes: InvitationCode[]
  loading: boolean
  error: string | null
  copiedCode: string | null
  onCopy: (code: string) => void
  onDeactivate: (id: string) => void
}

export interface InvitationCodeModalProps {
  open: boolean
  onClose: () => void
  onGenerate: (data: GenerateFormData) => void
  loading: boolean
}
