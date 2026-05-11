import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Zod 4 $strip branding prevents assignability to ZodType<any>
export const validate = (schema: z.ZodType | any) => {
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Zod 4 $strip branding prevents assignability to ZodType<any>
export const validateQuery = (schema: z.ZodType | any) => {
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Zod 4 $strip branding prevents assignability to ZodType<any>
export const validateParams = (schema: z.ZodType | any) => {
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