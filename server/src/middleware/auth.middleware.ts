import type { Request, Response, NextFunction } from 'express'
import { db } from '../db/client.js'

export interface AuthRequest extends Request {
  userId?: string
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined

  if (!token) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }

  const result = await db.query<{ user_id: string }>(
    'select user_id from sessions where token = $1 limit 1',
    [token],
  )
  const session = result.rows[0]
  if (!session) {
    res.status(401).json({ error: 'Invalid or expired session' })
    return
  }

  req.userId = session.user_id
  next()
}
