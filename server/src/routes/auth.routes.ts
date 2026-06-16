import { Router } from 'express'
import type { AuthRequest } from '../middleware/auth.middleware.js'
import { requireAuth } from '../middleware/auth.middleware.js'
import * as authService from '../services/auth.service.js'

const router = Router()

router.post('/login', (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string }

  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' })
    return
  }

  const result = authService.login(username, password)
  if ('error' in result) {
    res.status(401).json({ error: result.error })
    return
  }

  res.json(result)
})

router.post('/register', (req, res) => {
  const { username, displayName, password } = req.body as {
    username?: string
    displayName?: string
    password?: string
  }

  if (!username || !displayName || !password) {
    res.status(400).json({ error: 'Username, display name, and password are required' })
    return
  }

  const result = authService.register(username, displayName, password)
  if ('error' in result) {
    res.status(400).json({ error: result.error })
    return
  }

  res.status(201).json(result)
})

router.get('/me', requireAuth, (req: AuthRequest, res) => {
  const result = authService.getMe(req.userId!)
  if ('error' in result) {
    res.status(404).json({ error: result.error })
    return
  }

  res.json(result)
})

router.post('/logout', requireAuth, (req: AuthRequest, res) => {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined
  if (token) authService.logout(token)
  res.json({ success: true })
})

export default router
