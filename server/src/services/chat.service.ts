import { randomUUID } from 'node:crypto'
import { deleteMediaFile } from '../middleware/upload.middleware.js'
import { store } from '../store/memory.store.js'
import type { Conversation, Message, SendMessageInput } from '../types/index.js'

function enrichConversation(conv: Conversation, currentUserId: string) {
  const otherId = conv.participantIds.find((id) => id !== currentUserId)!
  const other = store.findUserById(otherId)
  return {
    id: conv.id,
    participant: other ? store.toPublicUser(other) : null,
    lastMessage: conv.lastMessage ?? null,
    updatedAt: conv.updatedAt,
  }
}

function previewForMessage(input: SendMessageInput): string {
  if (input.type === 'image') return input.content?.trim() || 'Photo'
  if (input.type === 'voice') return 'Voice message'
  return input.content?.trim() ?? ''
}

function appendMessage(conversationId: string, conv: Conversation, message: Message) {
  const existing = store.messages.get(conversationId) ?? []
  existing.push(message)
  store.messages.set(conversationId, existing)
  conv.lastMessage = message
  conv.updatedAt = message.createdAt
  store.conversations.set(conversationId, conv)
}

export function listConversations(userId: string) {
  const convs = [...store.conversations.values()]
    .filter((c) => c.participantIds.includes(userId))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((c) => enrichConversation(c, userId))

  return { conversations: convs }
}

export function listUsers(currentUserId: string) {
  const users = [...store.users.values()]
    .filter((u) => u.id !== currentUserId)
    .map((u) => store.toPublicUser(u))

  return { users }
}

export function getMessages(conversationId: string, userId: string) {
  const conv = store.conversations.get(conversationId)
  if (!conv || !conv.participantIds.includes(userId)) {
    return { error: 'Conversation not found' as const }
  }

  const msgs = store.messages.get(conversationId) ?? []
  return { messages: msgs }
}

export function sendMessage(conversationId: string, userId: string, input: SendMessageInput) {
  const conv = store.conversations.get(conversationId)
  if (!conv || !conv.participantIds.includes(userId)) {
    return { error: 'Conversation not found' as const }
  }

  const type = input.type ?? 'text'

  if (type === 'text') {
    const trimmed = input.content?.trim() ?? ''
    if (!trimmed) return { error: 'Message cannot be empty' as const }
  } else if (type === 'image') {
    if (!input.mediaUrl) return { error: 'Image URL is required' as const }
  } else if (type === 'voice') {
    if (!input.mediaUrl) return { error: 'Audio URL is required' as const }
    if (input.duration == null || input.duration < 0) {
      return { error: 'Voice duration is required' as const }
    }
  } else {
    return { error: 'Invalid message type' as const }
  }

  const message: Message = {
    id: randomUUID(),
    conversationId,
    senderId: userId,
    type,
    content: previewForMessage(input),
    createdAt: new Date().toISOString(),
  }

  if (input.mediaUrl) message.mediaUrl = input.mediaUrl
  if (input.duration != null) message.duration = input.duration

  appendMessage(conversationId, conv, message)
  return { message }
}

export function startConversation(userId: string, otherUserId: string) {
  if (userId === otherUserId) {
    return { error: 'Cannot message yourself' as const }
  }

  const other = store.findUserById(otherUserId)
  if (!other) {
    return { error: 'User not found' as const }
  }

  const conv = store.getOrCreateConversation(userId, otherUserId)
  return { conversation: enrichConversation(conv, userId) }
}

export async function deleteConversation(conversationId: string, userId: string) {
  const conv = store.conversations.get(conversationId)
  if (!conv || !conv.participantIds.includes(userId)) {
    return { error: 'Conversation not found' as const }
  }

  const msgs = store.messages.get(conversationId) ?? []
  await Promise.all(msgs.map((m) => deleteMediaFile(m.mediaUrl)))

  store.conversations.delete(conversationId)
  store.messages.delete(conversationId)
  return { success: true as const }
}

export async function deleteMessage(conversationId: string, messageId: string, userId: string) {
  const conv = store.conversations.get(conversationId)
  if (!conv || !conv.participantIds.includes(userId)) {
    return { error: 'Conversation not found' as const }
  }

  const msgs = store.messages.get(conversationId) ?? []
  const index = msgs.findIndex((m) => m.id === messageId)
  if (index === -1) {
    return { error: 'Message not found' as const }
  }

  if (msgs[index].senderId !== userId) {
    return { error: 'You can only delete your own messages' as const }
  }

  const [removed] = msgs.splice(index, 1)
  await deleteMediaFile(removed.mediaUrl)
  store.messages.set(conversationId, msgs)

  const last = msgs.at(-1)
  conv.lastMessage = last
  conv.updatedAt = last?.createdAt ?? new Date().toISOString()
  store.conversations.set(conversationId, conv)

  return { success: true as const }
}
