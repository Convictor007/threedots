import { Router } from 'express'
import type { AuthRequest } from '../middleware/auth.middleware.js'
import { requireAuth } from '../middleware/auth.middleware.js'
import * as authService from '../services/auth.service.js'

const router = Router()

router.post('/login', async (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string }

  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' })
    return
  }

  const result = await authService.login(username, password)
  if ('error' in result) {
    res.status(401).json({ error: result.error })
    return
  }

  res.json(result)
})

router.post('/register', async (req, res) => {
  const { username, displayName, password } = req.body as {
    username?: string
    displayName?: string
    password?: string
  }

  if (!username || !displayName || !password) {
    res.status(400).json({ error: 'Username, display name, and password are required' })
    return
  }

  const result = await authService.register(username, displayName, password)
  if ('error' in result) {
    res.status(400).json({ error: result.error })
    return
  }

  res.status(201).json(result)
})

router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  const result = await authService.getMe(req.userId!)
  if ('error' in result) {
    res.status(404).json({ error: result.error })
    return
  }

  res.json(result)
})

router.patch('/profile', requireAuth, async (req: AuthRequest, res) => {
  const body = req.body as {
    displayName?: string
    avatarColor?: string
    avatarUrl?: string | null
  }

  const result = await authService.updateProfile(req.userId!, body)
  if ('error' in result) {
    res.status(400).json({ error: result.error })
    return
  }

  res.json(result)
})

router.patch('/username', requireAuth, async (req: AuthRequest, res) => {
  const { username, currentPassword } = req.body as {
    username?: string
    currentPassword?: string
  }

  if (!username || !currentPassword) {
    res.status(400).json({ error: 'Username and current password are required' })
    return
  }

  const result = await authService.updateUsername(req.userId!, username, currentPassword)
  if ('error' in result) {
    res.status(400).json({ error: result.error })
    return
  }

  res.json(result)
})

router.patch('/password', requireAuth, async (req: AuthRequest, res) => {
  const { currentPassword, newPassword } = req.body as {
    currentPassword?: string
    newPassword?: string
  }

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'Current and new password are required' })
    return
  }

  const result = await authService.updatePassword(req.userId!, currentPassword, newPassword)
  if ('error' in result) {
    res.status(400).json({ error: result.error })
    return
  }

  res.json(result)
})

router.post('/heartbeat', requireAuth, async (req: AuthRequest, res) => {
  await authService.touchLastSeen(req.userId!)
  res.json({ success: true })
})

router.post('/logout', requireAuth, async (req: AuthRequest, res) => {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined
  if (token) await authService.logout(token)
  res.json({ success: true })
})

export default router
