import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Request, Response, NextFunction } from 'express'
import { authenticateJWT, requireRole } from '../auth-middleware'
import { UserService, TokenPayload } from '../../services/user-service'

// Mock UserService
vi.mock('../../services/user-service', () => ({
  UserService: {
    verifyToken: vi.fn(),
  },
}))

describe('authenticateJWT', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let mockNext: NextFunction
  let jsonMock: ReturnType<typeof vi.fn>
  let statusMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    jsonMock = vi.fn()
    statusMock = vi.fn().mockReturnValue({ json: jsonMock })
    
    mockReq = {
      headers: {},
      query: {},
    }
    mockRes = {
      status: statusMock,
      json: jsonMock,
    }
    mockNext = vi.fn()
    
    vi.clearAllMocks()
  })

  describe('RFC 6750 Compliance - Query Parameter Tokens', () => {
    it('should reject tokens in query parameter with 401', () => {
      // @ts-expect-error - testing invalid input
      mockReq.query = { token: 'some-query-token' }
      
      authenticateJWT(mockReq as Request, mockRes as Response, mockNext)
      
      expect(statusMock).toHaveBeenCalledWith(401)
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Access token required in Authorization header (Bearer scheme)',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should reject when query token exists but no Authorization header', () => {
      // @ts-expect-error - testing invalid input
      mockReq.query = { token: 'some-query-token' }
      
      authenticateJWT(mockReq as Request, mockRes as Response, mockNext)
      
      expect(statusMock).toHaveBeenCalledWith(401)
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('Authorization Header Tokens', () => {
    const validPayload: TokenPayload = {
      userId: 'user-123',
      username: 'testuser',
      role: 'user' as const,
    }

    it('should accept valid Bearer token in Authorization header', () => {
      mockReq.headers = { authorization: 'Bearer valid-access-token' }
      ;(UserService.verifyToken as ReturnType<typeof vi.fn>).mockReturnValue(validPayload)
      
      authenticateJWT(mockReq as Request, mockRes as Response, mockNext)
      
      expect(UserService.verifyToken).toHaveBeenCalledWith('valid-access-token')
      expect(mockReq.user).toEqual(validPayload)
      expect(mockNext).toHaveBeenCalled()
      expect(statusMock).not.toHaveBeenCalled()
    })

    it('should reject invalid token with 401', () => {
      mockReq.headers = { authorization: 'Bearer invalid-token' }
      ;(UserService.verifyToken as ReturnType<typeof vi.fn>).mockReturnValue(null)
      
      authenticateJWT(mockReq as Request, mockRes as Response, mockNext)
      
      expect(statusMock).toHaveBeenCalledWith(401)
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: '认证令牌无效或已过期',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should reject refresh token used as access token', () => {
      mockReq.headers = { authorization: 'Bearer refresh-token' }
      ;(UserService.verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({
        ...validPayload,
        type: 'refresh',
      })
      
      authenticateJWT(mockReq as Request, mockRes as Response, mockNext)
      
      expect(statusMock).toHaveBeenCalledWith(401)
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: '认证令牌类型错误',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('requireRole middleware', () => {
    it('should return 401 when user is not authenticated', () => {
      mockReq.user = undefined
      
      const middleware = requireRole(['admin'])
      middleware(mockReq as Request, mockRes as Response, mockNext)
      
      expect(statusMock).toHaveBeenCalledWith(401)
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: '未认证',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should return 403 when user lacks required role', () => {
      mockReq.user = {
        userId: 'user-123',
        username: 'testuser',
        role: 'user',
      }
      
      const middleware = requireRole(['admin'])
      middleware(mockReq as Request, mockRes as Response, mockNext)
      
      expect(statusMock).toHaveBeenCalledWith(403)
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: '权限不足',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should call next when user has required role', () => {
      mockReq.user = {
        userId: 'user-123',
        username: 'testuser',
        role: 'admin',
      }
      
      const middleware = requireRole(['admin'])
      middleware(mockReq as Request, mockRes as Response, mockNext)
      
      expect(mockNext).toHaveBeenCalled()
      expect(statusMock).not.toHaveBeenCalled()
    })
  })
})
