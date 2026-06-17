import { useCallback, useEffect, useRef, useState } from 'react'
import { chatApi } from '../api/chat.api'
import { mediaApi } from '../api/media.api'
import { conversationChannel, getPusherClient, PRESENCE_USERS_CHANNEL } from '../lib/realtime'
import { useAuth } from '../context/AuthContext'
import { usePinLock } from '../context/PinLockContext'
import { usePresence } from '../context/PresenceContext'
import { ConversationList } from '../components/chat/ConversationList'
import { ChatWindow } from '../components/chat/ChatWindow'
import { Avatar } from '../components/chat/Avatar'
import { WellnessLogo } from '../components/brand/WellnessLogo'
import { PinLockScreen } from '../components/security/PinLockScreen'
import { SettingsModal } from '../components/settings/SettingsModal'
import { ConfirmModal } from '../components/common/ConfirmModal'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { BRAND } from '../constants/brand'
import type { ConversationPreview, Message, User } from '../types'
import { messagePreview } from '../types'
import { upsertMessage } from '../lib/messages'
import { showMessageNotification } from '../utils/notifications'
import './ChatPage.css'

const CONVERSATIONS_PAGE_SIZE = 20
const MESSAGES_PAGE_SIZE = 30

type PendingDelete =
  | { kind: 'conversation'; id: string; name: string }
  | { kind: 'message'; messageId: string }
  | null

interface ChatPageProps {
  onOpenAdmin?: () => void
}

export function ChatPage({ onOpenAdmin }: ChatPageProps) {
  const { user, logout } = useAuth()
  const { isOnline } = usePresence()
  const { locked, unlock } = usePinLock()
  const [conversations, setConversations] = useState<ConversationPreview[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [showNewChat, setShowNewChat] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [loadingMoreConversations, setLoadingMoreConversations] = useState(false)
  const [conversationsPage, setConversationsPage] = useState(1)
  const [conversationsHasMore, setConversationsHasMore] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false)
  const [messagesPage, setMessagesPage] = useState(1)
  const [messagesHasMore, setMessagesHasMore] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [typingLabel, setTypingLabel] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null)
  const [deleting, setDeleting] = useState(false)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const processingQueueRef = useRef(false)
  const outboxOrderRef = useRef<string[]>([])
  const outboxTasksRef = useRef<Map<string, OutboxTask>>(new Map())

  const activeConversation = conversations.find((c) => c.id === activeId) ?? null
  const activeParticipant = activeConversation?.participant
  const activeParticipantName = activeParticipant?.displayName

  type OutboxTask =
    | {
        clientId: string
        conversationId: string
        kind: 'text'
        content: string
      }
    | {
        clientId: string
        conversationId: string
        kind: 'image'
        file: File
      }
    | {
        clientId: string
        conversationId: string
        kind: 'voice'
        blob: Blob
        duration: number
      }

  const sortByCreatedAt = useCallback(
    (items: Message[]) => [...items].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)),
    [],
  )

  const mergeMessages = useCallback(
    (current: Message[], incoming: Message[]) => {
      const byId = new Map<string, Message>()
      current.forEach((message) => byId.set(message.id, message))
      incoming.forEach((message) => byId.set(message.id, message))
      return sortByCreatedAt(Array.from(byId.values()))
    },
    [sortByCreatedAt],
  )

  const revokeObjectUrl = useCallback((url?: string) => {
    if (!url?.startsWith('blob:')) return
    URL.revokeObjectURL(url)
  }, [])

  const updateMessageStatus = useCallback(
    (clientId: string, status: Message['sendStatus'], errorText?: string) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.clientId === clientId
            ? {
                ...msg,
                sendStatus: status,
                errorText,
              }
            : msg,
        ),
      )
    },
    [],
  )

  const replaceLocalMessage = useCallback(
    (clientId: string, serverMessage: Message) => {
      setMessages((prev) => {
        const local = prev.find((msg) => msg.clientId === clientId)
        revokeObjectUrl(local?.mediaUrl)
        const withoutLocal = prev.filter((msg) => msg.clientId !== clientId)
        return mergeMessages(withoutLocal, [{ ...serverMessage, sendStatus: 'sent' }])
      })
    },
    [mergeMessages, revokeObjectUrl],
  )

  const enqueueTask = useCallback((task: OutboxTask) => {
    outboxTasksRef.current.set(task.clientId, task)
    outboxOrderRef.current.push(task.clientId)
  }, [])

  const createLocalMessage = useCallback(
    (
      conversationId: string,
      input: {
        type: Message['type']
        content: string
        mediaUrl?: string
        duration?: number
      },
    ): Message => {
      const clientId = `local-${crypto.randomUUID()}`
      return {
        id: clientId,
        clientId,
        conversationId,
        senderId: user?.id ?? '',
        type: input.type,
        content: input.content,
        mediaUrl: input.mediaUrl,
        duration: input.duration,
        createdAt: new Date().toISOString(),
        sendStatus: 'queued',
      }
    },
    [user?.id],
  )

  const loadConversations = useCallback(async (page = 1, append = false) => {
    if (append) {
      setLoadingMoreConversations(true)
    } else {
      setLoadingConversations(true)
    }
    try {
      const { conversations: convs, hasMore } = await chatApi.getConversations({
        page,
        limit: CONVERSATIONS_PAGE_SIZE,
      })
      setConversationsPage(page)
      setConversationsHasMore(hasMore)
      setConversations((prev) => {
        if (!append) return convs
        const byId = new Map(prev.map((conv) => [conv.id, conv]))
        convs.forEach((conv) => byId.set(conv.id, conv))
        return Array.from(byId.values())
      })
      return convs
    } finally {
      if (append) {
        setLoadingMoreConversations(false)
      } else {
        setLoadingConversations(false)
      }
    }
  }, [])

  const processOutbox = useCallback(async () => {
    if (processingQueueRef.current) return
    processingQueueRef.current = true
    try {
      while (outboxOrderRef.current.length > 0) {
        const clientId = outboxOrderRef.current[0]
        const task = outboxTasksRef.current.get(clientId)
        if (!task) {
          outboxOrderRef.current.shift()
          continue
        }

        updateMessageStatus(clientId, 'sending')
        try {
          if (task.kind === 'text') {
            const { message } = await chatApi.sendText(task.conversationId, task.content)
            replaceLocalMessage(clientId, message)
          } else if (task.kind === 'image') {
            const { url } = await mediaApi.uploadImage(task.file)
            const { message } = await chatApi.sendImage(task.conversationId, url)
            replaceLocalMessage(clientId, message)
          } else {
            const { url } = await mediaApi.uploadAudio(task.blob)
            const { message } = await chatApi.sendVoice(task.conversationId, url, task.duration)
            replaceLocalMessage(clientId, message)
          }
          outboxTasksRef.current.delete(clientId)
          await loadConversations()
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to send message'
          updateMessageStatus(clientId, 'failed', message)
        } finally {
          outboxOrderRef.current.shift()
        }
      }
    } finally {
      processingQueueRef.current = false
    }
  }, [loadConversations, replaceLocalMessage, updateMessageStatus])

  const applyUserUpdate = useCallback((updated: User) => {
    setConversations((prev) =>
      prev.map((conv) =>
        conv.participant?.id === updated.id
          ? { ...conv, participant: { ...conv.participant, ...updated } }
          : conv,
      ),
    )
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)))
  }, [])

  useEffect(() => {
    if (!locked) {
      loadConversations()
    }
  }, [loadConversations, locked])

  useEffect(() => {
    if (!user || locked) return

    const pusher = getPusherClient()
    if (!pusher) return

    const channel = pusher.channel(PRESENCE_USERS_CHANNEL) ?? pusher.subscribe(PRESENCE_USERS_CHANNEL)

    const onUserUpdated = ({ user: updated }: { user: User }) => {
      applyUserUpdate(updated)
    }

    channel.bind('user:updated', onUserUpdated)
    return () => {
      channel.unbind('user:updated', onUserUpdated)
    }
  }, [user, locked, applyUserUpdate])

  useEffect(() => {
    if (!activeId || locked) {
      setMessages((prev) => {
        prev.forEach((msg) => revokeObjectUrl(msg.mediaUrl))
        return []
      })
      setLoadingMessages(false)
      setTypingLabel(null)
      return
    }

    let cancelled = false
    setMessagesPage(1)
    setLoadingMessages(true)
    chatApi.getMessages(activeId, { page: 1, limit: MESSAGES_PAGE_SIZE }).then(({ messages: msgs, hasMore }) => {
      if (!cancelled) {
        setMessages(msgs)
        setMessagesHasMore(hasMore)
        setLoadingMessages(false)
      }
    })

    const interval = setInterval(() => {
      chatApi
        .getMessages(activeId, { page: 1, limit: MESSAGES_PAGE_SIZE })
        .then(({ messages: msgs }) => setMessages((prev) => mergeMessages(prev, msgs)))
    }, 30000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [activeId, locked, mergeMessages, revokeObjectUrl])

  async function loadMoreConversations() {
    if (loadingMoreConversations || !conversationsHasMore) return
    await loadConversations(conversationsPage + 1, true)
  }

  async function loadMoreMessages() {
    if (!activeId || loadingMoreMessages || !messagesHasMore) return
    setLoadingMoreMessages(true)
    try {
      const nextPage = messagesPage + 1
      const { messages: older, hasMore } = await chatApi.getMessages(activeId, {
        page: nextPage,
        limit: MESSAGES_PAGE_SIZE,
      })
      setMessages((prev) => mergeMessages(prev, older))
      setMessagesPage(nextPage)
      setMessagesHasMore(hasMore)
    } finally {
      setLoadingMoreMessages(false)
    }
  }

  useEffect(() => {
    if (!activeId || locked) return

    const pusher = getPusherClient()
    if (!pusher) return

    const channel = pusher.subscribe(conversationChannel(activeId))

    const onNew = (message: Message) => {
      setMessages((prev) => upsertMessage(prev, message))
      setTypingLabel(null)

      if (message.senderId !== user?.id) {
        const participantName = activeParticipantName ?? 'Wellness Session'
        void showMessageNotification(`New message from ${participantName}`, messagePreview(message))
      }

      void loadConversations()
    }

    const onDeleted = ({ messageId }: { messageId: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId))
      void loadConversations()
    }

    const onConversationDeleted = ({ conversationId }: { conversationId: string }) => {
      if (conversationId === activeId) {
        setActiveId(null)
        setMessages((prev) => {
          prev.forEach((msg) => revokeObjectUrl(msg.mediaUrl))
          return []
        })
      }
      void loadConversations()
    }

    const onTyping = ({ userId, displayName }: { userId: string; displayName: string }) => {
      if (userId === user?.id) return
      setTypingLabel(`${displayName} is typing...`)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => setTypingLabel(null), 4000)
    }

    channel.bind('message:new', onNew)
    channel.bind('message:deleted', onDeleted)
    channel.bind('conversation:deleted', onConversationDeleted)
    channel.bind('typing', onTyping)

    return () => {
      channel.unbind('message:new', onNew)
      channel.unbind('message:deleted', onDeleted)
      channel.unbind('conversation:deleted', onConversationDeleted)
      channel.unbind('typing', onTyping)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      pusher.unsubscribe(conversationChannel(activeId))
    }
  }, [activeId, activeParticipantName, locked, loadConversations, revokeObjectUrl, user?.id])

  async function handleSendText(content: string) {
    if (!activeId) return
    const local = createLocalMessage(activeId, {
      type: 'text',
      content,
    })
    setMessages((prev) => mergeMessages(prev, [local]))
    enqueueTask({
      clientId: local.clientId!,
      conversationId: activeId,
      kind: 'text',
      content,
    })
    await processOutbox()
  }

  async function handleSendImage(file: File) {
    if (!activeId) return
    const previewUrl = URL.createObjectURL(file)
    const local = createLocalMessage(activeId, {
      type: 'image',
      content: 'Photo',
      mediaUrl: previewUrl,
    })
    setMessages((prev) => mergeMessages(prev, [local]))
    enqueueTask({
      clientId: local.clientId!,
      conversationId: activeId,
      kind: 'image',
      file,
    })
    await processOutbox()
  }

  async function handleSendVoice(blob: Blob, duration: number) {
    if (!activeId) return
    const previewUrl = URL.createObjectURL(blob)
    const local = createLocalMessage(activeId, {
      type: 'voice',
      content: 'Voice message',
      mediaUrl: previewUrl,
      duration,
    })
    setMessages((prev) => mergeMessages(prev, [local]))
    enqueueTask({
      clientId: local.clientId!,
      conversationId: activeId,
      kind: 'voice',
      blob,
      duration,
    })
    await processOutbox()
  }

  async function handleRetryMessage(messageId: string) {
    const failed = messages.find((msg) => msg.id === messageId && msg.clientId)
    if (!failed?.clientId) return
    const task = outboxTasksRef.current.get(failed.clientId)
    if (!task) return
    if (outboxOrderRef.current.includes(failed.clientId)) return
    updateMessageStatus(failed.clientId, 'queued')
    outboxOrderRef.current.push(failed.clientId)
    await processOutbox()
  }

  function handleTyping() {
    if (!activeId) return
    void chatApi.sendTyping(activeId).catch(() => {})
  }

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await logout()
    } finally {
      setLoggingOut(false)
    }
  }

  async function handleNewChat() {
    const { users: allUsers } = await chatApi.getUsers()
    setUsers(allUsers)
    setShowNewChat(true)
  }

  async function startChatWith(otherUserId: string) {
    const { conversation } = await chatApi.startConversation(otherUserId)
    await loadConversations()
    setActiveId(conversation.id)
    setShowNewChat(false)
  }

  async function handleDeleteConversation(conversationId: string) {
    await chatApi.deleteConversation(conversationId)
    if (activeId === conversationId) {
      setActiveId(null)
      setMessages((prev) => {
        prev.forEach((msg) => revokeObjectUrl(msg.mediaUrl))
        return []
      })
    }
    await loadConversations()
  }

  function requestDeleteConversation(id: string, name: string) {
    setPendingDelete({ kind: 'conversation', id, name })
  }

  function requestDeleteMessage(messageId: string) {
    setPendingDelete({ kind: 'message', messageId })
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      if (pendingDelete.kind === 'conversation') {
        await handleDeleteConversation(pendingDelete.id)
      } else if (activeId) {
        const maybeLocal = messages.find((m) => m.id === pendingDelete.messageId)
        revokeObjectUrl(maybeLocal?.mediaUrl)
        await chatApi.deleteMessage(activeId, pendingDelete.messageId)
        setMessages((prev) => prev.filter((m) => m.id !== pendingDelete.messageId))
        await loadConversations()
      }
      setPendingDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  async function handleDeleteMessage(messageId: string) {
    requestDeleteMessage(messageId)
  }

  if (!user) return null

  if (locked) {
    return <PinLockScreen onUnlock={unlock} />
  }

  return (
    <div className="chat-page">
      <header className="chat-page__topbar">
        <div className="chat-page__topbar-start">
          <div className="chat-page__brand">
            <WellnessLogo size="sm" />
            <div>
              <span className="chat-page__brand-name">{BRAND.name}</span>
              <span className="chat-page__brand-sub">Wellness Dashboard</span>
            </div>
          </div>
        </div>
        <div className="chat-page__topbar-center">
          {loadingConversations && <LoadingSpinner size="sm" />}
        </div>
        <div className="chat-page__topbar-end chat-page__user">
          <button
            type="button"
            className="chat-page__profile-btn"
            onClick={() => setShowSettings(true)}
            aria-label="Open profile settings"
          >
            <Avatar user={user} size="sm" online={true} />
            <span>{user.displayName}</span>
          </button>
          <button
            type="button"
            className="settings-btn"
            onClick={() => setShowSettings(true)}
            aria-label="Settings"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.07 7.07 0 0 0-1.63-.94l-.36-2.54A.49.49 0 0 0 14 2h-4a.49.49 0 0 0-.49.42l-.36 2.54a7.07 7.07 0 0 0-1.63.94l-2.39-.96a.49.49 0 0 0-.59.22L2.62 8.04a.49.49 0 0 0 .12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.14.24.44.32.68.22l2.39-.96c.5.38 1.04.7 1.63.94l.36 2.54c.05.24.24.42.49.42h4c.25 0 .44-.18.49-.42l.36-2.54c.59-.24 1.13-.56 1.63-.94l2.39.96c.24.1.54.02.68-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.03-1.58zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z" />
            </svg>
          </button>
          {onOpenAdmin && (
            <button type="button" className="admin-link-btn" onClick={onOpenAdmin}>
              Admin
            </button>
          )}
          <button type="button" className="logout-btn" onClick={handleLogout} disabled={loggingOut}>
            {loggingOut ? <LoadingSpinner size="sm" /> : 'Sign out'}
          </button>
        </div>
      </header>

      <div
        className={`chat-page__body ${
          activeConversation ? 'chat-page__body--conversation-active' : ''
        }`}
      >
        <ConversationList
          conversations={conversations}
          activeId={activeId}
          onSelect={setActiveId}
          onNewChat={handleNewChat}
          onRequestDelete={requestDeleteConversation}
          isUserOnline={isOnline}
          hasMore={conversationsHasMore}
          loadingMore={loadingMoreConversations}
          onLoadMore={loadMoreConversations}
        />
        <ChatWindow
          conversation={activeConversation}
          messages={messages}
          currentUserId={user.id}
          participantOnline={activeParticipant ? isOnline(activeParticipant.id) : false}
          typingLabel={typingLabel}
          onBackToList={() => setActiveId(null)}
          onSendText={handleSendText}
          onSendImage={handleSendImage}
          onSendVoice={handleSendVoice}
          onTyping={handleTyping}
          onRequestDeleteConversation={
            activeConversation?.participant
              ? () =>
                  requestDeleteConversation(
                    activeConversation.id,
                    activeConversation.participant!.displayName,
                  )
              : undefined
          }
          onDeleteMessage={handleDeleteMessage}
          onRetryMessage={handleRetryMessage}
          loadingMessages={loadingMessages}
          hasMoreMessages={messagesHasMore}
          loadingMoreMessages={loadingMoreMessages}
          onLoadMoreMessages={loadMoreMessages}
          busyLabel={null}
          sending={false}
        />
      </div>

      {showNewChat && (
        <div className="new-chat-modal" onClick={() => setShowNewChat(false)}>
          <div className="new-chat-modal__content" onClick={(e) => e.stopPropagation()}>
            <h3>{BRAND.newSessionModalTitle}</h3>
            <div className="new-chat-modal__users">
              {users.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  className="new-chat-user"
                  onClick={() => startChatWith(u.id)}
                >
                  <Avatar user={u} online={isOnline(u.id)} />
                  <div>
                    <span className="new-chat-user__name">{u.displayName}</span>
                    <span className="new-chat-user__username">
                      {isOnline(u.id) ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            <button type="button" className="new-chat-modal__close" onClick={() => setShowNewChat(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {pendingDelete && (
        <ConfirmModal
          title={pendingDelete.kind === 'conversation' ? 'Delete session?' : 'Delete message?'}
          message={
            pendingDelete.kind === 'conversation'
              ? `Delete wellness session with ${pendingDelete.name}? This cannot be undone.`
              : 'Delete this message? This cannot be undone.'
          }
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
          loading={deleting}
        />
      )}
    </div>
  )
}
