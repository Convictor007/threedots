export type MessageType = 'text' | 'image' | 'voice'

export type UserRole = 'user' | 'admin'

export interface User {
  id: string
  username: string
  displayName: string
  avatarColor: string
  avatarUrl?: string
  lastSeenAt?: string
  role?: UserRole
}

export interface AdminUser extends User {
  createdAt: string
  updatedAt: string
  sessionCount: number
  messageCount: number
  conversationCount: number
}

export interface AdminDashboardStats {
  totalUsers: number
  adminUsers: number
  activeSessions: number
  totalMessages: number
  totalConversations: number
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
  clientId?: string
  sendStatus?: 'queued' | 'sending' | 'failed' | 'sent'
  errorText?: string
}

export interface ConversationPreview {
  id: string
  participant: User | null
  lastMessage: Message | null
  updatedAt: string
}

export interface PaginationMeta {
  page: number
  limit: number
  hasMore: boolean
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
