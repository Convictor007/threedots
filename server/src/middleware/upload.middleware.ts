import { unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import multer from 'multer'
import { del, put } from '@vercel/blob'
import { AUDIO_DIR, AUDIO_MIMES, IMAGE_DIR, IMAGE_MIMES, UPLOADS_ROOT } from '../config/uploads.js'

const inMemoryStorage = multer.memoryStorage()

export const uploadImage = multer({
  storage: inMemoryStorage,
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
  storage: inMemoryStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (AUDIO_MIMES.has(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Only audio files are allowed'))
    }
  },
}).single('file')

type MediaKind = 'image' | 'audio'

function folderFor(kind: MediaKind) {
  return kind === 'image' ? 'images' : 'audio'
}

async function uploadToBlob(file: Express.Multer.File, kind: MediaKind) {
  const ext = path.extname(file.originalname) || (kind === 'image' ? '.jpg' : '.webm')
  const filename = `${folderFor(kind)}/${randomUUID()}${ext}`
  const blob = await put(filename, file.buffer, {
    access: 'public',
    contentType: file.mimetype,
    addRandomSuffix: false,
  })
  return blob.url
}

async function uploadToDisk(file: Express.Multer.File, kind: MediaKind) {
  const ext = path.extname(file.originalname) || (kind === 'image' ? '.jpg' : '.webm')
  const filename = `${randomUUID()}${ext}`
  const dir = kind === 'image' ? IMAGE_DIR : AUDIO_DIR
  const relative = `${folderFor(kind)}/${filename}`
  await writeFile(path.join(dir, filename), file.buffer)
  return `/api/media/${relative}`
}

export async function persistImage(file: Express.Multer.File) {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return uploadToBlob(file, 'image')
  }
  return uploadToDisk(file, 'image')
}

export async function persistAudio(file: Express.Multer.File) {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return uploadToBlob(file, 'audio')
  }
  return uploadToDisk(file, 'audio')
}

export async function deleteMediaFile(mediaUrl?: string) {
  if (!mediaUrl) return

  if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        await del(mediaUrl)
      } catch {
        // ignore failed blob delete
      }
    }
    return
  }

  if (!mediaUrl.startsWith('/api/media/')) return

  const relative = mediaUrl.replace('/api/media/', '')
  const filePath = path.join(UPLOADS_ROOT, relative)

  try {
    await unlink(filePath)
  } catch {
    // ignore missing files
  }
}
