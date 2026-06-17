import type { Response, NextFunction } from 'express'
import { db } from '../db/client.js'
import { isAdminRole } from '../config/admin.js'
import type { AuthRequest } from './auth.middleware.js'

export async function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.userId) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }

  const result = await db.query<{ username: string; role: string | null }>(
    'select username, role from users where id = $1 limit 1',
    [req.userId],
  )
  const user = result.rows[0]
  if (!user) {
    res.status(401).json({ error: 'User not found' })
    return
  }

  if (!isAdminRole(user.role)) {
    res.status(403).json({ error: 'Admin access required' })
    return
  }

  next()
}
