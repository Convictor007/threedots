import { apiClient } from './client'
import type { ConversationPreview, Message, SendMessagePayload, User } from '../types'

export const chatApi = {
  getConversations() {
    return apiClient.get<{ conversations: ConversationPreview[] }>('/chat/conversations')
  },

  getUsers() {
    return apiClient.get<{ users: User[] }>('/chat/users')
  },

  startConversation(userId: string) {
    return apiClient.post<{ conversation: ConversationPreview }>('/chat/conversations', {
      userId,
    })
  },

  getMessages(conversationId: string) {
    return apiClient.get<{ messages: Message[] }>(
      `/chat/conversations/${conversationId}/messages`,
    )
  },

  sendMessage(conversationId: string, payload: SendMessagePayload) {
    return apiClient.post<{ message: Message }>(
      `/chat/conversations/${conversationId}/messages`,
      payload,
    )
  },

  sendText(conversationId: string, content: string) {
    return this.sendMessage(conversationId, { type: 'text', content })
  },

  sendImage(conversationId: string, mediaUrl: string, caption?: string) {
    return this.sendMessage(conversationId, {
      type: 'image',
      mediaUrl,
      content: caption?.trim() || 'Photo',
    })
  },

  sendVoice(conversationId: string, mediaUrl: string, duration: number) {
    return this.sendMessage(conversationId, {
      type: 'voice',
      mediaUrl,
      duration,
      content: 'Voice message',
    })
  },

  deleteConversation(conversationId: string) {
    return apiClient.delete<{ success: boolean }>(`/chat/conversations/${conversationId}`)
  },

  deleteMessage(conversationId: string, messageId: string) {
    return apiClient.delete<{ success: boolean }>(
      `/chat/conversations/${conversationId}/messages/${messageId}`,
    )
  },
}
