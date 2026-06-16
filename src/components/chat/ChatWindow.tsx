import { useEffect, useRef } from 'react'
import { BRAND } from '../../constants/brand'
import type { ConversationPreview, Message } from '../../types'
import { WellnessLogo } from '../brand/WellnessLogo'
import { TrashIcon } from '../icons/TrashIcon'
import { Avatar } from './Avatar'
import { MessageBubble } from './MessageBubble'
import { MessageInput } from './MessageInput'
import './ChatWindow.css'

interface ChatWindowProps {
  conversation: ConversationPreview | null
  messages: Message[]
  currentUserId: string
  onBackToList?: () => void
  onSendText: (content: string) => void
  onSendImage: (file: File) => void
  onSendVoice: (blob: Blob, duration: number) => void
  onDeleteConversation?: (conversationId: string) => void
  onDeleteMessage?: (messageId: string) => void
  loadingMessages?: boolean
  sending?: boolean
  busyLabel?: string | null
}

export function ChatWindow({
  conversation,
  messages,
  currentUserId,
  onBackToList,
  onSendText,
  onSendImage,
  onSendVoice,
  onDeleteConversation,
  onDeleteMessage,
  loadingMessages,
  sending,
  busyLabel,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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

  const { participant, id: conversationId } = conversation

  function handleDeleteSession() {
    if (!onDeleteConversation || !window.confirm(`Delete this wellness session with ${participant.displayName}?`)) {
      return
    }
    onDeleteConversation(conversationId)
  }

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
        <Avatar user={participant} size="sm" />
        <div className="chat-window__header-info">
          <h3>{participant.displayName}</h3>
          <span>Licensed Wellness Counselor</span>
        </div>
        {onDeleteConversation && (
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

      <div className="chat-window__messages">
        {loadingMessages && (
          <div className="chat-window__loading" role="status" aria-live="polite">
            Loading messages...
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isOwn={msg.senderId === currentUserId}
            onDelete={onDeleteMessage}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      <MessageInput
        onSendText={onSendText}
        onSendImage={onSendImage}
        onSendVoice={onSendVoice}
        disabled={sending}
        busyLabel={busyLabel}
      />
    </div>
  )
}
