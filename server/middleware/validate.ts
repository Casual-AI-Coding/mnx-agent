import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'

// Zod 4 $strip branding prevents direct assignability to ZodType<any, any, any>
// Use explicit type params to preserve type safety while avoiding the branding issue
type ZodSchema = z.ZodType<any, any, any>

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success && result.error) {
      const issueList = result.error.issues as Array<{ path: (string | number)[]; message: string }>
      const errorMessages = issueList.map((e) => 
        `${e.path.join('.')}: ${e.message}`
      ).join(', ')
      res.status(400).json({ 
        success: false, 
        error: errorMessages 
      })
      return
    }
    req.body = result.data
    next()
  }
}

export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query)
    if (!result.success && result.error) {
      const issueList = result.error.issues as Array<{ path: (string | number)[]; message: string }>
      const errorMessages = issueList.map((e) => 
        `${e.path.join('.')}: ${e.message}`
      ).join(', ')
      res.status(400).json({ 
        success: false, 
        error: errorMessages 
      })
      return
    }
    req.query = result.data as typeof req.query
    next()
  }
}

export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params)
    if (!result.success && result.error) {
      const issueList = result.error.issues as Array<{ path: (string | number)[]; message: string }>
      const errorMessages = issueList.map((e) => 
        `${e.path.join('.')}: ${e.message}`
      ).join(', ')
      res.status(400).json({ 
        success: false, 
        error: errorMessages 
      })
      return
    }
    req.params = result.data as typeof req.params
    next()
  }
}