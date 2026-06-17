import { Router } from 'express'
import type { AuthRequest } from '../middleware/auth.middleware.js'
import { requireAuth } from '../middleware/auth.middleware.js'
import * as authService from '../services/auth.service.js'

const router = Router()

router.use(requireAuth)

router.get('/users', async (req: AuthRequest, res) => {
  const raw = req.query.userIds
  const userIds =
    typeof raw === 'string'
      ? raw.split(',').map((id) => id.trim()).filter(Boolean)
      : []

  const result = await authService.getPresenceInfo(userIds)
  res.json(result)
})

router.post('/heartbeat', async (req: AuthRequest, res) => {
  await authService.touchLastSeen(req.userId!)
  res.json({ success: true })
})

export default router
