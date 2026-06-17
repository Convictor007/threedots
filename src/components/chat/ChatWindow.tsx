import { useCallback, useEffect, useRef } from 'react'
import type { UIEvent } from 'react'
import { formatLastSeen } from '../../context/PresenceContext'
import { BRAND } from '../../constants/brand'
import type { ConversationPreview, Message } from '../../types'
import { WellnessLogo } from '../brand/WellnessLogo'
import { TrashIcon } from '../icons/TrashIcon'
import { Avatar } from './Avatar'
import { MessageBubble } from './MessageBubble'
import { MessageInput } from './MessageInput'
import { LoadingSpinner } from '../common/LoadingSpinner'
import './ChatWindow.css'

interface ChatWindowProps {
  conversation: ConversationPreview | null
  messages: Message[]
  currentUserId: string
  participantOnline?: boolean
  typingLabel?: string | null
  onBackToList?: () => void
  onSendText: (content: string) => void
  onSendImage: (file: File) => void
  onSendVoice: (blob: Blob, duration: number) => void
  onTyping?: () => void
  onRequestDeleteConversation?: () => void
  onDeleteMessage?: (messageId: string) => void
  onRetryMessage?: (messageId: string) => void
  loadingMessages?: boolean
  hasMoreMessages?: boolean
  loadingMoreMessages?: boolean
  onLoadMoreMessages?: () => void
  sending?: boolean
  busyLabel?: string | null
}

export function ChatWindow({
  conversation,
  messages,
  currentUserId,
  participantOnline,
  typingLabel,
  onBackToList,
  onSendText,
  onSendImage,
  onSendVoice,
  onTyping,
  onRequestDeleteConversation,
  onDeleteMessage,
  onRetryMessage,
  loadingMessages,
  hasMoreMessages,
  loadingMoreMessages,
  onLoadMoreMessages,
  sending,
  busyLabel,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const messagesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typingLabel])

  const handleMessagesScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      if (!hasMoreMessages || loadingMoreMessages || !onLoadMoreMessages) return
      const target = event.currentTarget
      if (target.scrollTop <= 80) {
        onLoadMoreMessages()
      }
    },
    [hasMoreMessages, loadingMoreMessages, onLoadMoreMessages],
  )

  if (!conversation?.participant) {
    return (
      <div className="chat-window chat-window--empty">
        <div className="chat-window__placeholder">
          <WellnessLogo size="lg" />
          <h3>{BRAND.emptyChatTitle}</h3>
          <p>{BRAND.emptyChatSubtitle}</p>
        </div>
      </div>
    )
  }

  const { participant } = conversation

  function handleDeleteSession() {
    onRequestDeleteConversation?.()
  }

  const statusText = typingLabel
    ? typingLabel
    : participantOnline
      ? 'Online'
      : formatLastSeen(participant.lastSeenAt)

  return (
    <div className="chat-window">
      <header className="chat-window__header">
        {onBackToList && (
          <button
            type="button"
            className="chat-window__back-btn"
            onClick={onBackToList}
            aria-label="Back to sessions"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
            </svg>
          </button>
        )}
        <Avatar user={participant} size="sm" online={participantOnline} />
        <div className="chat-window__header-info">
          <h3>{participant.displayName}</h3>
          {loadingMessages ? (
            <span className="chat-window__status chat-window__status--loading">
              <LoadingSpinner size="sm" />
            </span>
          ) : (
            <span className={typingLabel ? 'chat-window__status chat-window__status--typing' : 'chat-window__status'}>
              {statusText}
            </span>
          )}
        </div>
        {onRequestDeleteConversation && (
          <button
            type="button"
            className="chat-window__delete-btn"
            onClick={handleDeleteSession}
            aria-label="Delete session"
            title="Delete session"
          >
            <TrashIcon size={20} />
          </button>
        )}
      </header>

      <div ref={messagesRef} className="chat-window__messages" onScroll={handleMessagesScroll}>
        {loadingMoreMessages && (
          <div className="chat-window__paging-state" role="status" aria-live="polite">
            Loading older messages...
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isOwn={msg.senderId === currentUserId}
            onDelete={onDeleteMessage}
            onRetry={onRetryMessage}
          />
        ))}
        {typingLabel && (
          <div className="chat-window__typing" role="status" aria-live="polite">
            <span className="chat-window__typing-dots" aria-hidden>
              <span />
              <span />
              <span />
            </span>
            <span>{typingLabel}</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <MessageInput
        onSendText={onSendText}
        onSendImage={onSendImage}
        onSendVoice={onSendVoice}
        onTyping={onTyping}
        disabled={sending}
        busyLabel={busyLabel}
      />
    </div>
  )
}
