import { Router } from 'express'
import type { AuthRequest } from '../middleware/auth.middleware.js'
import { requireAuth } from '../middleware/auth.middleware.js'
import * as chatService from '../services/chat.service.js'

const router = Router()

router.use(requireAuth)

router.get('/conversations', (req: AuthRequest, res) => {
  const result = chatService.listConversations(req.userId!)
  res.json(result)
})

router.get('/users', (req: AuthRequest, res) => {
  const result = chatService.listUsers(req.userId!)
  res.json(result)
})

router.post('/conversations', (req: AuthRequest, res) => {
  const { userId: otherUserId } = req.body as { userId?: string }

  if (!otherUserId) {
    res.status(400).json({ error: 'userId is required' })
    return
  }

  const result = chatService.startConversation(req.userId!, otherUserId)
  if ('error' in result) {
    res.status(400).json({ error: result.error })
    return
  }

  res.status(201).json(result)
})

router.get('/conversations/:id/messages', (req: AuthRequest, res) => {
  const conversationId = String(req.params.id)
  const result = chatService.getMessages(conversationId, req.userId!)
  if ('error' in result) {
    res.status(404).json({ error: result.error })
    return
  }

  res.json(result)
})

router.post('/conversations/:id/messages', (req: AuthRequest, res) => {
  const conversationId = String(req.params.id)
  const body = req.body as {
    type?: 'text' | 'image' | 'voice'
    content?: string
    mediaUrl?: string
    duration?: number
  }

  const result = chatService.sendMessage(conversationId, req.userId!, {
    type: body.type ?? 'text',
    content: body.content,
    mediaUrl: body.mediaUrl,
    duration: body.duration,
  })
  if ('error' in result) {
    res.status(400).json({ error: result.error })
    return
  }

  res.status(201).json(result)
})

router.delete('/conversations/:id', async (req: AuthRequest, res) => {
  const conversationId = String(req.params.id)
  const result = await chatService.deleteConversation(conversationId, req.userId!)
  if ('error' in result) {
    res.status(404).json({ error: result.error })
    return
  }

  res.json(result)
})

router.delete('/conversations/:id/messages/:messageId', async (req: AuthRequest, res) => {
  const conversationId = String(req.params.id)
  const messageId = String(req.params.messageId)
  const result = await chatService.deleteMessage(conversationId, messageId, req.userId!)
  if ('error' in result) {
    const status = result.error === 'You can only delete your own messages' ? 403 : 404
    res.status(status).json({ error: result.error })
    return
  }

  res.json(result)
})

export default router
