import { Router, type Request, type Response } from 'express'
import type { AuthRequest } from '../middleware/auth.middleware.js'
import { requireAuth } from '../middleware/auth.middleware.js'
import {
  persistAudio,
  persistImage,
  uploadAudio,
  uploadImage,
} from '../middleware/upload.middleware.js'

const router = Router()

router.use(requireAuth)

function handleUpload(
  uploader: typeof uploadImage,
  persistFile: (file: Express.Multer.File) => Promise<string>,
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

      persistFile(req.file)
        .then((url) => {
          res.status(201).json({ url })
        })
        .catch(() => {
          res.status(500).json({ error: 'Failed to store media' })
        })
    })
  }
}

router.post('/image', handleUpload(uploadImage, persistImage))
router.post('/audio', handleUpload(uploadAudio, persistAudio))

export default router
