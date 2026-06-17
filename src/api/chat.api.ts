import { apiClient } from './client'
import { clearChatCache, getCached, setCached } from '../lib/chatCache'
import type {
  ConversationPreview,
  Message,
  PaginationMeta,
  SendMessagePayload,
  User,
} from '../types'

interface PagingParams {
  page?: number
  limit?: number
}

interface ConversationsResponse extends PaginationMeta {
  conversations: ConversationPreview[]
}

interface MessagesResponse extends PaginationMeta {
  messages: Message[]
}

function toPagingQuery(params?: PagingParams) {
  const page = params?.page ?? 1
  const limit = params?.limit
  const query = new URLSearchParams()
  query.set('page', String(page))
  if (limit != null) query.set('limit', String(limit))
  return query.toString()
}

export const chatApi = {
  async getConversations(params?: PagingParams) {
    const query = toPagingQuery(params)
    const cacheKey = `conversations:${query}`
    const cached = getCached<ConversationsResponse>(cacheKey)
    if (cached) return cached

    const response = await apiClient.get<ConversationsResponse>(`/chat/conversations?${query}`)
    setCached(cacheKey, response, 15000)
    return response
  },

  getUsers() {
    return apiClient.get<{ users: User[] }>('/chat/users')
  },

  startConversation(userId: string) {
    clearChatCache()
    return apiClient.post<{ conversation: ConversationPreview }>('/chat/conversations', {
      userId,
    })
  },

  async getMessages(conversationId: string, params?: PagingParams) {
    const query = toPagingQuery(params)
    const cacheKey = `messages:${conversationId}:${query}`
    const cached = getCached<MessagesResponse>(cacheKey)
    if (cached) return cached

    const response = await apiClient.get<MessagesResponse>(
      `/chat/conversations/${conversationId}/messages?${query}`,
    )
    setCached(cacheKey, response, 10000)
    return response
  },

  sendMessage(conversationId: string, payload: SendMessagePayload) {
    return apiClient.post<{ message: Message }>(
      `/chat/conversations/${conversationId}/messages`,
      payload,
    )
  },

  sendText(conversationId: string, content: string) {
    clearChatCache()
    return this.sendMessage(conversationId, { type: 'text', content })
  },

  sendImage(conversationId: string, mediaUrl: string, caption?: string) {
    clearChatCache()
    return this.sendMessage(conversationId, {
      type: 'image',
      mediaUrl,
      content: caption?.trim() || 'Photo',
    })
  },

  sendVoice(conversationId: string, mediaUrl: string, duration: number) {
    clearChatCache()
    return this.sendMessage(conversationId, {
      type: 'voice',
      mediaUrl,
      duration,
      content: 'Voice message',
    })
  },

  deleteConversation(conversationId: string) {
    clearChatCache()
    return apiClient.delete<{ success: boolean }>(`/chat/conversations/${conversationId}`)
  },

  deleteMessage(conversationId: string, messageId: string) {
    clearChatCache()
    return apiClient.delete<{ success: boolean }>(
      `/chat/conversations/${conversationId}/messages/${messageId}`,
    )
  },

  sendTyping(conversationId: string) {
    return apiClient.post<{ success: boolean }>(`/chat/conversations/${conversationId}/typing`)
  },
}
