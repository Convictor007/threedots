import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.routes.js'
import chatRoutes from './routes/chat.routes.js'
import mediaRoutes from './routes/media.routes.js'
import presenceRoutes from './routes/presence.routes.js'
import realtimeRoutes from './routes/realtime.routes.js'
import adminRoutes from './routes/admin.routes.js'
import { ensureUploadDirs, UPLOADS_ROOT } from './config/uploads.js'

export function createApp() {
  const app = express()

  ensureUploadDirs()

  app.use(cors())
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  app.use('/api/media', express.static(UPLOADS_ROOT))

  app.use('/api/auth', authRoutes)
  app.use('/api/chat', chatRoutes)
  app.use('/api/chat/media', mediaRoutes)
  app.use('/api/presence', presenceRoutes)
  app.use('/api/realtime', realtimeRoutes)
  app.use('/api/admin', adminRoutes)

  return app
}
