import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('service permissions route dependency contract', () => {
  it('delegates every editable permission field to the service', () => {
    const source = readFileSync(resolve(process.cwd(), 'server/routes/admin/service-permissions.ts'), 'utf8')

    expect(source).toContain('await svc.update(id, { display_name, category, min_role, is_enabled })')
    expect(source).not.toContain('svc.getConnection(')
    expect(source).not.toContain('UPDATE service_node_permissions')
  })
})
