import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'

export const validate = (schema: z.ZodType) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      const errorMessages = result.error.issues.map((e: z.ZodIssue) => 
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

export const validateQuery = (schema: z.ZodType) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query)
    if (!result.success) {
      const errorMessages = result.error.issues.map((e: z.ZodIssue) => 
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

export const validateParams = (schema: z.ZodType) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params)
    if (!result.success) {
      const errorMessages = result.error.issues.map((e: z.ZodIssue) => 
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