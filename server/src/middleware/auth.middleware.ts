import type { Request, Response, NextFunction } from 'express'
import { store } from '../store/memory.store.js'

export interface AuthRequest extends Request {
  userId?: string
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined

  if (!token) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }

  const session = store.getSession(token)
  if (!session) {
    res.status(401).json({ error: 'Invalid or expired session' })
    return
  }

  req.userId = session.userId
  next()
}
