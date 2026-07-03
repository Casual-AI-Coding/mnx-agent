import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import { setupTestDatabase, teardownTestDatabase, getConnection, getTestFileMarker } from '../../__tests__/test-helpers.js'
import templatesRouter from '../templates.js'

type AuthenticatedRequest = express.Request & {
  user?: {
    userId: string
    username: string
    role: 'user'
  }
}

describe('Prompt Templates API Routes', () => {
  let app: express.Application
  let ownerId: string

  const mockAuthMiddleware = (req: AuthenticatedRequest, _res: express.Response, next: express.NextFunction) => {
    req.user = {
      userId: ownerId,
      username: `templates-api-test-${ownerId.slice(0, 8)}`,
      role: 'user',
    }
    next()
  }

  beforeAll(async () => {
    await setupTestDatabase()
    ownerId = getTestFileMarker(import.meta.url)
    app = express()
    app.use(express.json())
    app.use(mockAuthMiddleware)
    app.use('/api/templates', templatesRouter)

    const conn = getConnection()
    await conn.execute(
      `INSERT INTO users (id, username, password_hash, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`,
      [ownerId, `templates-api-test-${ownerId.slice(0, 8)}`, 'hash', 'user', true, new Date().toISOString(), new Date().toISOString()]
    )
  })

  beforeEach(async () => {
    const conn = getConnection()
    await conn.execute(
      `DELETE FROM prompt_template_versions
       WHERE template_id IN (SELECT id FROM prompt_templates WHERE owner_id = $1)`,
      [ownerId]
    )
    await conn.execute('DELETE FROM prompt_templates WHERE owner_id = $1', [ownerId])
  })

  afterAll(async () => {
    const conn = getConnection()
    await conn.execute(
      `DELETE FROM prompt_template_versions
       WHERE template_id IN (SELECT id FROM prompt_templates WHERE owner_id = $1)`,
      [ownerId]
    )
    await conn.execute('DELETE FROM prompt_templates WHERE owner_id = $1', [ownerId])
    await conn.execute('DELETE FROM users WHERE id = $1', [ownerId])
    await teardownTestDatabase()
  })

  async function createTemplate(name: string, content: string) {
    return request(app).post('/api/templates').send({
      name,
      description: `${name} description`,
      content,
      category: 'general',
      variables: [{ name: 'name', required: true }],
    })
  }

  it('creates and lists prompt template versions for the authenticated owner', async () => {
    const templateRes = await createTemplate('Greeting Prompt', 'Hello {{name}}')
    expect(templateRes.status).toBe(201)

    const versionRes = await request(app)
      .post(`/api/templates/${templateRes.body.data.id}/versions`)
      .send({ change_summary: 'Initial version' })

    expect(versionRes.status).toBe(201)
    expect(versionRes.body.success).toBe(true)
    expect(versionRes.body.data.version_number).toBe(1)
    expect(versionRes.body.data.change_summary).toBe('Initial version')

    const listRes = await request(app).get(`/api/templates/${templateRes.body.data.id}/versions`)

    expect(listRes.status).toBe(200)
    expect(listRes.body.success).toBe(true)
    expect(listRes.body.data.versions).toHaveLength(1)
    expect(listRes.body.data.versions[0].version_number).toBe(1)
  })

  it('compares two prompt template versions with field-level differences', async () => {
    const templateRes = await createTemplate('Greeting Prompt', 'Hello {{name}}')
    expect(templateRes.status).toBe(201)

    const firstVersion = await request(app)
      .post(`/api/templates/${templateRes.body.data.id}/versions`)
      .send({ change_summary: 'Initial version' })
    expect(firstVersion.status).toBe(201)

    const updateRes = await request(app).put(`/api/templates/${templateRes.body.data.id}`).send({
      name: 'Friendly Prompt',
      description: 'Friendly description',
      content: 'Hi {{name}}',
      variables: [{ name: 'name', required: false }],
    })
    expect(updateRes.status).toBe(200)

    const secondVersion = await request(app)
      .post(`/api/templates/${templateRes.body.data.id}/versions`)
      .send({ change_summary: 'Friendlier greeting' })
    expect(secondVersion.status).toBe(201)

    const compareRes = await request(app)
      .get(`/api/templates/${templateRes.body.data.id}/versions/compare`)
      .query({ from: 1, to: 2 })

    expect(compareRes.status).toBe(200)
    expect(compareRes.body.data.diffs).toEqual(expect.arrayContaining([
      { field: 'name', from: 'Greeting Prompt', to: 'Friendly Prompt' },
      { field: 'content', from: 'Hello {{name}}', to: 'Hi {{name}}' },
      { field: 'variables', from: [{ name: 'name', required: true }], to: [{ name: 'name', required: false }] },
    ]))
  })

  it('rolls back a prompt template to a selected version', async () => {
    const templateRes = await createTemplate('Greeting Prompt', 'Hello {{name}}')
    expect(templateRes.status).toBe(201)

    const firstVersion = await request(app)
      .post(`/api/templates/${templateRes.body.data.id}/versions`)
      .send({ change_summary: 'Initial version' })
    expect(firstVersion.status).toBe(201)

    const updateRes = await request(app).put(`/api/templates/${templateRes.body.data.id}`).send({
      name: 'Changed Prompt',
      content: 'Changed {{name}}',
    })
    expect(updateRes.status).toBe(200)

    const rollbackRes = await request(app)
      .post(`/api/templates/${templateRes.body.data.id}/versions/${firstVersion.body.data.id}/rollback`)

    expect(rollbackRes.status).toBe(200)
    expect(rollbackRes.body.success).toBe(true)
    expect(rollbackRes.body.data.name).toBe('Greeting Prompt')
    expect(rollbackRes.body.data.content).toBe('Hello {{name}}')

    const versionsRes = await request(app).get(`/api/templates/${templateRes.body.data.id}/versions`)
    expect(versionsRes.body.data.versions[0].is_active).toBe(true)
  })
})
