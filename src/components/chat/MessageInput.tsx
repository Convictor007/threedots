import { useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react'
import { BRAND } from '../../constants/brand'
import { formatDuration, useVoiceRecorder } from '../../hooks/useVoiceRecorder'
import './MessageInput.css'

interface MessageInputProps {
  onSendText: (content: string) => void
  onSendImage: (file: File) => void
  onSendVoice: (blob: Blob, duration: number) => void
  disabled?: boolean
  busyLabel?: string | null
}

export function MessageInput({
  onSendText,
  onSendImage,
  onSendVoice,
  disabled,
  busyLabel,
}: MessageInputProps) {
  const [text, setText] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const { isRecording, duration, error, startRecording, stopRecording, cancelRecording } =
    useVoiceRecorder()

  function submitText() {
    const trimmed = text.trim()
    if (!trimmed || disabled || isRecording) return
    onSendText(trimmed)
    setText('')
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    submitText()
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submitText()
    }
  }

  function handleImagePick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file && !disabled && !isRecording) {
      onSendImage(file)
    }
  }

  async function handleMicClick() {
    if (disabled) return
    if (isRecording) {
      const result = await stopRecording()
      if (result) {
        onSendVoice(result.blob, result.duration)
      }
    } else {
      await startRecording()
    }
  }

  return (
    <div className="message-input-wrap">
      {busyLabel && !isRecording && (
        <div className="message-input-busy" role="status" aria-live="polite">
          <span className="message-input-busy__spinner" />
          <span>{busyLabel}</span>
        </div>
      )}
      {isRecording && (
        <div className="message-input-recording">
          <span className="message-input-recording__dot" />
          <span>Recording {formatDuration(duration)}</span>
          <button type="button" className="message-input-recording__cancel" onClick={cancelRecording}>
            Cancel
          </button>
        </div>
      )}
      {error && <p className="message-input-error">{error}</p>}

      <form className="message-input" onSubmit={handleSubmit}>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="message-input__file"
          onChange={handleImagePick}
          aria-hidden
          tabIndex={-1}
        />

        <button
          type="button"
          className="message-input__attach"
          onClick={() => fileRef.current?.click()}
          disabled={disabled || isRecording}
          aria-label="Send image"
          title="Send image"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
          </svg>
        </button>

        <button
          type="button"
          className={`message-input__mic ${isRecording ? 'message-input__mic--active' : ''}`}
          onClick={handleMicClick}
          disabled={disabled}
          aria-label={isRecording ? 'Stop and send voice message' : 'Record voice message'}
          title={isRecording ? 'Stop and send' : 'Voice message'}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z" />
          </svg>
        </button>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={BRAND.messagePlaceholder}
          rows={1}
          disabled={disabled || isRecording}
        />

        <button
          type="submit"
          disabled={!text.trim() || disabled || isRecording}
          aria-label="Send message"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </form>
    </div>
  )
}
