/**
 * Workflow Entity Types
 */

export interface WorkflowTemplate {
  id: string
  name: string
  description: string | null
  nodes_json: string
  edges_json: string
  owner_id: string | null
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface WorkflowVersion {
  id: string
  template_id: string
  version_number: number
  name: string
  description: string | null
  nodes_json: string
  edges_json: string
  change_summary: string | null
  created_by: string | null
  created_at: string
  is_active: boolean
}

export interface CreateWorkflowTemplate {
  name: string
  description?: string | null
  nodes_json: string
  edges_json: string
  owner_id?: string | null
  is_public?: boolean
}

export interface UpdateWorkflowTemplate {
  name?: string
  description?: string | null
  nodes_json?: string
  edges_json?: string
  owner_id?: string | null
  is_public?: boolean
}

export interface CreateWorkflowVersion {
  template_id: string
  version_number: number
  name: string
  description?: string | null
  nodes_json: string
  edges_json: string
  change_summary?: string | null
  created_by?: string | null
  is_active?: boolean
}

export interface UpdateWorkflowVersion {
  is_active?: boolean
}

export interface WorkflowTemplateRow {
  id: string
  name: string
  description: string | null
  nodes_json: string
  edges_json: string
  owner_id: string | null
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface WorkflowVersionRow {
  id: string
  template_id: string
  version_number: number
  name: string
  description: string | null
  nodes_json: string
  edges_json: string
  change_summary: string | null
  created_by: string | null
  created_at: string
  is_active: number | boolean
}

export interface WorkflowPermission {
  id: string
  workflow_id: string
  user_id: string
  granted_by: string | null
  created_at: string
}

export interface WorkflowPermissionRow {
  id: string
  workflow_id: string
  user_id: string
  granted_by: string | null
  created_at: string
}

export interface CreateWorkflowPermission {
  workflow_id: string
  user_id: string
  granted_by?: string | null
}

export interface ServiceNodePermission {
  id: string
  service_name: string
  method_name: string
  display_name: string
  category: string
  min_role: string
  is_enabled: boolean
  created_at: string
}

export interface ServiceNodePermissionRow {
  id: string
  service_name: string
  method_name: string
  display_name: string
  category: string
  min_role: string
  is_enabled: boolean
  created_at: string
}

export interface CreateServiceNodePermission {
  service_name: string
  method_name: string
  display_name: string
  category: string
  min_role?: string
  is_enabled?: boolean
}