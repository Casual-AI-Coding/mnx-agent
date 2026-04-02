import { TokenPayload } from '../services/user-service.js'

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload
    }
  }
}

export {}