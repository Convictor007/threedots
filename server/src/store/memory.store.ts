import { createHash, randomUUID } from 'node:crypto'
import type { Conversation, Message, Session, UserRecord } from '../types/index.js'

const users = new Map<string, UserRecord>()
const sessions = new Map<string, Session>()
const conversations = new Map<string, Conversation>()
const messages = new Map<string, Message[]>()

export function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

function seedUsers() {
  const seeded: { user: Omit<UserRecord, 'passwordHash'>; password: string }[] = [
    {
      user: {
        id: 'user-jenalyn',
        username: 'jenalyn',
        displayName: 'Jenalyn',
        avatarColor: '#52b788',
      },
      password: 'nyenye',
    },
    {
      user: {
        id: 'user-drxiao',
        username: 'dr.xiao',
        displayName: 'Dr. Xiao',
        avatarColor: '#2d6a4f',
      },
      password: 'xiao',
    },
  ]

  for (const { user, password } of seeded) {
    users.set(user.id, {
      ...user,
      passwordHash: hashPassword(password),
    })
  }
}

function seedConversations() {
  const pairs: [string, string][] = [['user-jenalyn', 'user-drxiao']]

  const seedMessages: Record<string, string[][]> = {
    'user-drxiao-user-jenalyn': [
      ['user-drxiao', 'Good morning! How did your meditation session go yesterday?'],
      ['user-jenalyn', 'Really peaceful. I slept so much better after it.'],
      ['user-drxiao', 'Wonderful. Remember to stay hydrated today as well.'],
      ['user-jenalyn', 'Will do! Can we talk later about my wellness plan?'],
    ],
  }

  for (const [a, b] of pairs) {
    const key = [a, b].sort().join('-')
    const convId = randomUUID()
    const now = new Date().toISOString()
    const convMessages: Message[] = []

    for (const [senderId, content] of seedMessages[key] ?? []) {
      const msg: Message = {
        id: randomUUID(),
        conversationId: convId,
        senderId,
        type: 'text',
        content,
        createdAt: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      }
      convMessages.push(msg)
    }

    convMessages.sort((x, y) => x.createdAt.localeCompare(y.createdAt))
    messages.set(convId, convMessages)

    const last = convMessages[convMessages.length - 1]
    conversations.set(convId, {
      id: convId,
      participantIds: [a, b],
      lastMessage: last,
      updatedAt: last?.createdAt ?? now,
    })
  }
}

seedUsers()
seedConversations()

export const store = {
  users,
  sessions,
  conversations,
  messages,

  findUserByUsername(username: string): UserRecord | undefined {
    return [...users.values()].find((u) => u.username === username.toLowerCase())
  },

  findUserById(id: string): UserRecord | undefined {
    return users.get(id)
  },

  createUser(username: string, displayName: string, password: string): UserRecord {
    const id = randomUUID()
    const colors = ['#2d6a4f', '#40916c', '#52b788', '#74c69d', '#95d5b2', '#1b4332']
    const user: UserRecord = {
      id,
      username: username.toLowerCase(),
      displayName,
      avatarColor: colors[Math.floor(Math.random() * colors.length)],
      passwordHash: hashPassword(password),
    }
    users.set(id, user)
    return user
  },

  createSession(userId: string): Session {
    const session: Session = {
      token: randomUUID(),
      userId,
      createdAt: new Date().toISOString(),
    }
    sessions.set(session.token, session)
    return session
  },

  getSession(token: string): Session | undefined {
    return sessions.get(token)
  },

  deleteSession(token: string): void {
    sessions.delete(token)
  },

  getOrCreateConversation(userId: string, otherUserId: string): Conversation {
    const existing = [...conversations.values()].find(
      (c) =>
        c.participantIds.length === 2 &&
        c.participantIds.includes(userId) &&
        c.participantIds.includes(otherUserId),
    )
    if (existing) return existing

    const conv: Conversation = {
      id: randomUUID(),
      participantIds: [userId, otherUserId],
      updatedAt: new Date().toISOString(),
    }
    conversations.set(conv.id, conv)
    messages.set(conv.id, [])
    return conv
  },

  toPublicUser(user: UserRecord) {
    const { passwordHash: _, ...publicUser } = user
    return publicUser
  },
}
