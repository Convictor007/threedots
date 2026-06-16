import { unlink } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import multer from 'multer'
import { AUDIO_DIR, AUDIO_MIMES, IMAGE_DIR, IMAGE_MIMES, UPLOADS_ROOT } from '../config/uploads.js'

const imageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, IMAGE_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg'
    cb(null, `${randomUUID()}${ext}`)
  },
})

const audioStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, AUDIO_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.webm'
    cb(null, `${randomUUID()}${ext}`)
  },
})

export const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (IMAGE_MIMES.has(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Only JPEG, PNG, GIF, and WebP images are allowed'))
    }
  },
}).single('file')

export const uploadAudio = multer({
  storage: audioStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (AUDIO_MIMES.has(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Only audio files are allowed'))
    }
  },
}).single('file')

export function mediaUrlForImage(filename: string) {
  return `/api/media/images/${filename}`
}

export function mediaUrlForAudio(filename: string) {
  return `/api/media/audio/${filename}`
}

export async function deleteMediaFile(mediaUrl?: string) {
  if (!mediaUrl?.startsWith('/api/media/')) return

  const relative = mediaUrl.replace('/api/media/', '')
  const filePath = path.join(UPLOADS_ROOT, relative)

  try {
    await unlink(filePath)
  } catch {
    // ignore missing files
  }
}
