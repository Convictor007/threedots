import type { Message } from '../../types'
import { TrashIcon } from '../icons/TrashIcon'
import './MessageBubble.css'

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
  onDelete?: (messageId: string) => void
  onRetry?: (messageId: string) => void
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatVoiceDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function MessageBubble({ message, isOwn, onDelete, onRetry }: MessageBubbleProps) {
  const type = message.type ?? 'text'
  const isMedia = type === 'image' || type === 'voice'
  const sendStatus = message.sendStatus ?? 'sent'
  const isFailed = sendStatus === 'failed'
  const isPending = sendStatus === 'queued' || sendStatus === 'sending'

  return (
    <div className={`message-row ${isOwn ? 'message-row--own' : ''}`}>
      <div
        className={`message-bubble ${isOwn ? 'message-bubble--own' : ''} ${isMedia ? 'message-bubble--media' : ''}`}
      >
        {type === 'image' && message.mediaUrl && (
          <a href={message.mediaUrl} target="_blank" rel="noopener noreferrer" className="message-image-link">
            <img src={message.mediaUrl} alt={message.content || 'Shared image'} className="message-image" />
          </a>
        )}

        {type === 'voice' && message.mediaUrl && (
          <div className="message-voice">
            <audio controls preload="metadata" src={message.mediaUrl} className="message-audio">
              <track kind="captions" />
            </audio>
            {message.duration != null && (
              <span className="message-voice__duration">{formatVoiceDuration(message.duration)}</span>
            )}
          </div>
        )}

        {type === 'text' && <p>{message.content}</p>}

        {type === 'image' && message.content && message.content !== 'Photo' && (
          <p className="message-caption">{message.content}</p>
        )}

        <div className="message-bubble__footer">
          <span className="message-time">{formatTime(message.createdAt)}</span>
          {isOwn && isPending && (
            <span className="message-status" aria-live="polite">
              {sendStatus === 'queued' ? 'Queued' : 'Sending...'}
            </span>
          )}
          {isOwn && isFailed && (
            <>
              <span className="message-status message-status--failed" title={message.errorText || 'Send failed'}>
                Failed
              </span>
              {onRetry && (
                <button
                  type="button"
                  className="message-retry-btn"
                  onClick={() => onRetry(message.id)}
                  aria-label="Retry sending message"
                  title="Retry"
                >
                  Retry
                </button>
              )}
            </>
          )}
          {isOwn && onDelete && !isPending && (
            <button
              type="button"
              className="message-delete-btn"
              onClick={() => onDelete(message.id)}
              aria-label="Delete message"
              title="Delete message"
            >
              <TrashIcon size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
