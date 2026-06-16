import { Router } from 'express'
import type { AuthRequest } from '../middleware/auth.middleware.js'
import { requireAuth } from '../middleware/auth.middleware.js'
import { db } from '../db/client.js'
import { getPusherServer } from '../lib/realtime.js'

const router = Router()

router.post('/auth', requireAuth, async (req: AuthRequest, res) => {
  const pusher = getPusherServer()
  if (!pusher) {
    res.status(503).json({ error: 'Realtime service not configured' })
    return
  }

  const { socket_id: socketId, channel_name: channelName } = req.body as {
    socket_id?: string
    channel_name?: string
  }

  if (!socketId || !channelName) {
    res.status(400).json({ error: 'socket_id and channel_name are required' })
    return
  }

  const prefix = 'private-conversation-'
  if (!channelName.startsWith(prefix)) {
    res.status(403).json({ error: 'Invalid channel' })
    return
  }

  const conversationId = channelName.slice(prefix.length)
  const access = await db.query(
    `select 1 from conversation_participants
     where conversation_id = $1 and user_id = $2
     limit 1`,
    [conversationId, req.userId!],
  )

  if (!(access.rowCount ?? 0)) {
    res.status(403).json({ error: 'Forbidden channel access' })
    return
  }

  const auth = pusher.authorizeChannel(socketId, channelName)
  res.send(auth)
})

export default router
