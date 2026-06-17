import { Router } from 'express'
import { requireAuth, type AuthRequest } from '../middleware/auth.middleware.js'
import { requireAdmin } from '../middleware/admin.middleware.js'
import {
  getDashboardStats,
  listAllUsers,
  revokeUserSessions,
  updateUserRole,
} from '../services/admin.service.js'

const router = Router()

router.use(requireAuth, requireAdmin)

router.get('/stats', async (_req, res) => {
  const stats = await getDashboardStats()
  res.json({
    stats: {
      totalUsers: stats.total_users,
      adminUsers: stats.admin_users,
      activeSessions: stats.active_sessions,
      totalMessages: stats.total_messages,
      totalConversations: stats.total_conversations,
    },
  })
})

router.get('/users', async (_req, res) => {
  const result = await listAllUsers()
  res.json(result)
})

router.delete('/users/:userId/sessions', async (req: AuthRequest, res) => {
  const userId = String(req.params.userId)
  const result = await revokeUserSessions(userId, req.userId!)
  if ('error' in result) {
    res.status(400).json({ error: result.error })
    return
  }
  res.json(result)
})

router.patch('/users/:userId/role', async (req: AuthRequest, res) => {
  const role = req.body?.role
  if (role !== 'user' && role !== 'admin') {
    res.status(400).json({ error: 'Role must be user or admin' })
    return
  }

  const userId = String(req.params.userId)
  const result = await updateUserRole(userId, role, req.userId!)
  if ('error' in result) {
    res.status(400).json({ error: result.error })
    return
  }
  res.json(result)
})

export default router
