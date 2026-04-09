import { Response } from 'express'
import { ROLE_HIERARCHY } from '../types/workflow'

interface ServiceNodePermission {
  service_name: string
  method_name: string
  is_enabled: boolean
  min_role: string
}

interface DatabaseService {
  getServiceNodePermission(service: string, method: string): Promise<ServiceNodePermission | null>
}

interface WorkflowNode {
  type: string
  data?: {
    config?: {
      service?: string
      method?: string
    }
  }
}

interface WorkflowNodesJson {
  nodes: WorkflowNode[]
}

export async function validateWorkflowNodePermissions(
  nodesJson: WorkflowNodesJson,
  userRole: string,
  db: DatabaseService,
  res: Response
): Promise<boolean> {
  const actionNodes = (nodesJson.nodes || []).filter(n => n.type === 'action')
  const userLevel = ROLE_HIERARCHY[userRole] ?? 0

  for (const node of actionNodes) {
    const config = node.data?.config || {}
    const { service, method } = config

    if (!service || !method) continue

    const permission = await db.getServiceNodePermission(service, method)

    if (!permission) {
      res.status(400).json({
        success: false,
        error: `Unknown service method: ${service}.${method}`,
      })
      return false
    }

    if (!permission.is_enabled) {
      res.status(403).json({
        success: false,
        error: `Service method ${service}.${method} is disabled`,
      })
      return false
    }

    const nodeLevel = ROLE_HIERARCHY[permission.min_role] ?? 0
    if (nodeLevel > userLevel) {
      res.status(403).json({
        success: false,
        error: `You don't have permission to use ${service}.${method}. Requires ${permission.min_role} role.`,
      })
      return false
    }
  }

  return true
}