import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LOCAL_UPLOADS_ROOT = path.join(__dirname, '../../uploads')
export const UPLOADS_ROOT = process.env.VERCEL
  ? path.join('/tmp', 'threedots-uploads')
  : LOCAL_UPLOADS_ROOT

export const IMAGE_DIR = path.join(UPLOADS_ROOT, 'images')
export const AUDIO_DIR = path.join(UPLOADS_ROOT, 'audio')

export function ensureUploadDirs() {
  mkdirSync(IMAGE_DIR, { recursive: true })
  mkdirSync(AUDIO_DIR, { recursive: true })
}

export const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
export const AUDIO_MIMES = new Set([
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'video/webm',
])
