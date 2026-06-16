import { useCallback, useEffect, useRef, useState } from 'react'

interface UseVoiceRecorderResult {
  isRecording: boolean
  duration: number
  error: string | null
  startRecording: () => Promise<void>
  stopRecording: () => Promise<{ blob: Blob; duration: number } | null>
  cancelRecording: () => void
}

export function useVoiceRecorder(): UseVoiceRecorderResult {
  const [isRecording, setIsRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef(0)

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const cancelRecording = useCallback(() => {
    clearTimer()
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.onstop = null
      recorderRef.current.stop()
      recorderRef.current.stream.getTracks().forEach((t) => t.stop())
    }
    recorderRef.current = null
    chunksRef.current = []
    setIsRecording(false)
    setDuration(0)
  }, [clearTimer])

  useEffect(() => {
    return () => cancelRecording()
  }, [cancelRecording])

  const startRecording = useCallback(async () => {
    setError(null)
    cancelRecording()

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'

      const recorder = new MediaRecorder(stream, { mimeType })
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorderRef.current = recorder
      startTimeRef.current = Date.now()
      setDuration(0)
      setIsRecording(true)

      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 200)

      recorder.start(200)
    } catch {
      setError('Microphone access denied or unavailable')
      cancelRecording()
    }
  }, [cancelRecording])

  const stopRecording = useCallback(async () => {
    const recorder = recorderRef.current
    if (!recorder || recorder.state === 'inactive') return null

    clearTimer()
    const finalDuration = Math.max(1, Math.floor((Date.now() - startTimeRef.current) / 1000))

    return new Promise<{ blob: Blob; duration: number } | null>((resolve) => {
      recorder.onstop = () => {
        recorder.stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType })
        recorderRef.current = null
        chunksRef.current = []
        setIsRecording(false)
        setDuration(0)
        resolve(blob.size > 0 ? { blob, duration: finalDuration } : null)
      }
      recorder.stop()
    })
  }, [clearTimer])

  return {
    isRecording,
    duration,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
  }
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export { formatDuration }
