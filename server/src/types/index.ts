export type MessageType = 'text' | 'image' | 'voice'

export interface User {
  id: string
  username: string
  displayName: string
  avatarColor: string
}

export interface UserRecord extends User {
  passwordHash: string
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

export interface Conversation {
  id: string
  participantIds: string[]
  lastMessage?: Message
  updatedAt: string
}

export interface Session {
  token: string
  userId: string
  createdAt: string
}

export interface SendMessageInput {
  type: MessageType
  content?: string
  mediaUrl?: string
  duration?: number
}
