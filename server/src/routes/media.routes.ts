import { Router, type Request, type Response } from 'express'
import type { AuthRequest } from '../middleware/auth.middleware.js'
import { requireAuth } from '../middleware/auth.middleware.js'
import {
  mediaUrlForAudio,
  mediaUrlForImage,
  uploadAudio,
  uploadImage,
} from '../middleware/upload.middleware.js'

const router = Router()

router.use(requireAuth)

function handleUpload(
  uploader: typeof uploadImage,
  urlBuilder: (filename: string) => string,
) {
  return (req: AuthRequest, res: Response) => {
    uploader(req as Request, res, (err: unknown) => {
      if (err) {
        const message = err instanceof Error ? err.message : 'Upload failed'
        res.status(400).json({ error: message })
        return
      }

      if (!req.file) {
        res.status(400).json({ error: 'No file provided' })
        return
      }

      res.status(201).json({ url: urlBuilder(req.file.filename) })
    })
  }
}

router.post('/image', handleUpload(uploadImage, mediaUrlForImage))
router.post('/audio', handleUpload(uploadAudio, mediaUrlForAudio))

export default router
