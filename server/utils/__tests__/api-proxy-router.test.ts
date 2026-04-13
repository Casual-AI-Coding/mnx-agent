import { createApiProxyRouter } from '../api-proxy-router'
import express, { Express } from 'express'
import request from 'supertest'
import { vi, describe, it, expect, beforeEach } from 'vitest'

describe('createApiProxyRouter', () => {
  let app: Express

  beforeEach(() => {
    app = express()
    app.use(express.json())
  })

  it('should create router with proxy endpoint', async () => {
    const mockClient = {
      textGeneration: vi.fn().mockResolvedValue({ data: { text: 'result' } })
    }

    const router = createApiProxyRouter({
      endpoint: '/generate',
      clientMethod: 'textGeneration',
      buildRequestBody: (req) => req.body,
      extractClient: () => mockClient
    })

    app.use('/api/proxy', router)

    const response = await request(app)
      .post('/api/proxy/generate')
      .send({ prompt: 'test' })

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data).toEqual({ text: 'result' })
  })

  it('should handle client errors', async () => {
    const mockClient = {
      textGeneration: vi.fn().mockRejectedValue(new Error('API error'))
    }

    const router = createApiProxyRouter({
      endpoint: '/generate',
      clientMethod: 'textGeneration',
      buildRequestBody: (req) => req.body,
      extractClient: () => mockClient
    })

    app.use('/api/proxy', router)

    const response = await request(app)
      .post('/api/proxy/generate')
      .send({ prompt: 'test' })

    expect(response.status).toBe(500)
    expect(response.body.success).toBe(false)
    expect(response.body.error).toBe('API error')
  })
})