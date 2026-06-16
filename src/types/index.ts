export type MessageType = 'text' | 'image' | 'voice'

export interface User {
  id: string
  username: string
  displayName: string
  avatarColor: string
}

export interface Message {
  id: string
  conversationId: string
  senderId: string
  type: MessageType
  content: string
  mediaUrl?: string
  duration?: number
  createdAt: string
}

export interface ConversationPreview {
  id: string
  participant: User | null
  lastMessage: Message | null
  updatedAt: string
}

export interface AuthResponse {
  user: User
  token: string
}

export interface SendMessagePayload {
  type: MessageType
  content?: string
  mediaUrl?: string
  duration?: number
}

export function messagePreview(message: Message): string {
  const type = message.type ?? 'text'
  if (type === 'image') return message.content || 'Photo'
  if (type === 'voice') return 'Voice message'
  return message.content
}
