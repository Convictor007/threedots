import { useCallback } from 'react'
import type { MouseEvent, UIEvent } from 'react'
import { BRAND } from '../../constants/brand'
import type { ConversationPreview } from '../../types'
import { messagePreview } from '../../types'
import { TrashIcon } from '../icons/TrashIcon'
import { Avatar } from './Avatar'
import './ConversationList.css'

interface ConversationListProps {
  conversations: ConversationPreview[]
  activeId: string | null
  onSelect: (id: string) => void
  onNewChat: () => void
  onRequestDelete: (id: string, displayName: string) => void
  isUserOnline?: (userId: string) => boolean
  hasMore?: boolean
  loadingMore?: boolean
  onLoadMore?: () => void
}

function formatPreviewTime(iso: string) {
  const date = new Date(iso)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday'
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onRequestDelete,
  isUserOnline,
  hasMore,
  loadingMore,
  onLoadMore,
}: ConversationListProps) {
  const handleScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      if (!hasMore || loadingMore || !onLoadMore) return
      const target = event.currentTarget
      const remaining = target.scrollHeight - target.scrollTop - target.clientHeight
      if (remaining <= 120) {
        onLoadMore()
      }
    },
    [hasMore, loadingMore, onLoadMore],
  )

  function handleDelete(e: MouseEvent, conv: ConversationPreview) {
    e.stopPropagation()
    const name = conv.participant?.displayName ?? 'this session'
    onRequestDelete(conv.id, name)
  }

  return (
    <aside className="conversation-list">
      <header className="conversation-list__header">
        <h2>{BRAND.sessionsLabel}</h2>
        <button
          type="button"
          className="new-chat-btn"
          onClick={onNewChat}
          aria-label={BRAND.newSessionLabel}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
        </button>
      </header>

      <div className="conversation-list__items" onScroll={handleScroll}>
        {conversations.length === 0 ? (
          <p className="conversation-list__empty">{BRAND.emptySessions}</p>
        ) : (
          conversations.map((conv) => {
            const participant = conv.participant
            if (!participant) return null

            return (
              <div
                key={conv.id}
                className={`conversation-item ${activeId === conv.id ? 'conversation-item--active' : ''}`}
              >
                <button
                  type="button"
                  className="conversation-item__main"
                  onClick={() => onSelect(conv.id)}
                >
                  <Avatar user={participant} online={isUserOnline?.(participant.id)} />
                  <div className="conversation-item__content">
                    <div className="conversation-item__top">
                      <span className="conversation-item__name">{participant.displayName}</span>
                      {conv.lastMessage && (
                        <span className="conversation-item__time">
                          {formatPreviewTime(conv.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                  {conv.lastMessage && (
                    <p className="conversation-item__preview">
                      {conv.lastMessage.type === 'image' && (
                        <span className="conversation-item__icon" aria-hidden>🖼 </span>
                      )}
                      {conv.lastMessage.type === 'voice' && (
                        <span className="conversation-item__icon" aria-hidden>🎤 </span>
                      )}
                      {messagePreview(conv.lastMessage)}
                    </p>
                  )}
                  </div>
                </button>
                <button
                  type="button"
                  className="conversation-item__delete"
                  onClick={(e) => handleDelete(e, conv)}
                  aria-label={`Delete session with ${participant.displayName}`}
                  title="Delete session"
                >
                  <TrashIcon size={16} />
                </button>
              </div>
            )
          })
        )}
      </div>
      {loadingMore && <div className="conversation-list__paging-state">Loading more sessions...</div>}
    </aside>
  )
}
