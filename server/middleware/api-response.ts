import { Response } from 'express'

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export function successResponse<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ success: true, data })
}

export function errorResponse(res: Response, error: string, status = 400): void {
  res.status(status).json({ success: false, error })
}

export function createdResponse<T>(res: Response, data: T): void {
  successResponse(res, data, 201)
}

export function deletedResponse(res: Response, details?: Record<string, unknown>): void {
  successResponse(res, { deleted: true, ...details })
}