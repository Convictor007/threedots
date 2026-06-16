import { useCallback, useEffect, useState } from 'react'
import { chatApi } from '../api/chat.api'
import { mediaApi } from '../api/media.api'
import { useAuth } from '../context/AuthContext'
import { usePinLock } from '../context/PinLockContext'
import { ConversationList } from '../components/chat/ConversationList'
import { ChatWindow } from '../components/chat/ChatWindow'
import { Avatar } from '../components/chat/Avatar'
import { WellnessLogo } from '../components/brand/WellnessLogo'
import { PinLockScreen } from '../components/security/PinLockScreen'
import { SettingsModal } from '../components/settings/SettingsModal'
import { BRAND } from '../constants/brand'
import type { ConversationPreview, Message, User } from '../types'
import './ChatPage.css'

export function ChatPage() {
  const { user, logout } = useAuth()
  const { locked, unlock } = usePinLock()
  const [conversations, setConversations] = useState<ConversationPreview[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [sending, setSending] = useState(false)
  const [showNewChat, setShowNewChat] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [users, setUsers] = useState<User[]>([])

  const activeConversation = conversations.find((c) => c.id === activeId) ?? null

  const loadConversations = useCallback(async () => {
    const { conversations: convs } = await chatApi.getConversations()
    setConversations(convs)
    return convs
  }, [])

  useEffect(() => {
    if (!locked) {
      loadConversations()
    }
  }, [loadConversations, locked])

  useEffect(() => {
    if (!activeId || locked) {
      setMessages([])
      return
    }

    chatApi.getMessages(activeId).then(({ messages: msgs }) => setMessages(msgs))

    const interval = setInterval(() => {
      chatApi.getMessages(activeId).then(({ messages: msgs }) => setMessages(msgs))
    }, 3000)

    return () => clearInterval(interval)
  }, [activeId, locked])

  async function handleSendText(content: string) {
    if (!activeId) return
    setSending(true)
    try {
      const { message } = await chatApi.sendText(activeId, content)
      setMessages((prev) => [...prev, message])
      await loadConversations()
    } finally {
      setSending(false)
    }
  }

  async function handleSendImage(file: File) {
    if (!activeId) return
    setSending(true)
    try {
      const { url } = await mediaApi.uploadImage(file)
      const { message } = await chatApi.sendImage(activeId, url)
      setMessages((prev) => [...prev, message])
      await loadConversations()
    } finally {
      setSending(false)
    }
  }

  async function handleSendVoice(blob: Blob, duration: number) {
    if (!activeId) return
    setSending(true)
    try {
      const { url } = await mediaApi.uploadAudio(blob)
      const { message } = await chatApi.sendVoice(activeId, url, duration)
      setMessages((prev) => [...prev, message])
      await loadConversations()
    } finally {
      setSending(false)
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
      setMessages([])
    }
    await loadConversations()
  }

  async function handleDeleteMessage(messageId: string) {
    if (!activeId) return
    if (!window.confirm('Delete this message?')) return

    await chatApi.deleteMessage(activeId, messageId)
    setMessages((prev) => prev.filter((m) => m.id !== messageId))
    await loadConversations()
  }

  if (!user) return null

  if (locked) {
    return <PinLockScreen onUnlock={unlock} />
  }

  return (
    <div className="chat-page">
      <header className="chat-page__topbar">
        <div className="chat-page__brand">
          <WellnessLogo size="sm" />
          <div>
            <span className="chat-page__brand-name">{BRAND.name}</span>
            <span className="chat-page__brand-sub">Wellness Dashboard</span>
          </div>
        </div>
        <div className="chat-page__user">
          <Avatar user={user} size="sm" />
          <span>{user.displayName}</span>
          <button
            type="button"
            className="settings-btn"
            onClick={() => setShowSettings(true)}
            aria-label="Privacy settings"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.07 7.07 0 0 0-1.63-.94l-.36-2.54A.49.49 0 0 0 14 2h-4a.49.49 0 0 0-.49.42l-.36 2.54a7.07 7.07 0 0 0-1.63.94l-2.39-.96a.49.49 0 0 0-.59.22L2.62 8.04a.49.49 0 0 0 .12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.14.24.44.32.68.22l2.39-.96c.5.38 1.04.7 1.63.94l.36 2.54c.05.24.24.42.49.42h4c.25 0 .44-.18.49-.42l.36-2.54c.59-.24 1.13-.56 1.63-.94l2.39.96c.24.1.54.02.68-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.03-1.58zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z" />
            </svg>
          </button>
          <button type="button" className="logout-btn" onClick={() => logout()}>
            Sign out
          </button>
        </div>
      </header>

      <div className="chat-page__body">
        <ConversationList
          conversations={conversations}
          activeId={activeId}
          onSelect={setActiveId}
          onNewChat={handleNewChat}
          onDelete={handleDeleteConversation}
        />
        <ChatWindow
          conversation={activeConversation}
          messages={messages}
          currentUserId={user.id}
          onSendText={handleSendText}
          onSendImage={handleSendImage}
          onSendVoice={handleSendVoice}
          onDeleteConversation={handleDeleteConversation}
          onDeleteMessage={handleDeleteMessage}
          sending={sending}
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
                  <Avatar user={u} />
                  <div>
                    <span className="new-chat-user__name">{u.displayName}</span>
                    <span className="new-chat-user__username">Wellness Counselor</span>
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
    </div>
  )
}
