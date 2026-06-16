import { uploadFormData } from './client'

export const mediaApi = {
  uploadImage(file: File) {
    const formData = new FormData()
    formData.append('file', file)
    return uploadFormData<{ url: string }>('/chat/media/image', formData)
  },

  uploadAudio(file: Blob, filename = 'voice.webm') {
    const formData = new FormData()
    formData.append('file', file, filename)
    return uploadFormData<{ url: string }>('/chat/media/audio', formData)
  },
}
