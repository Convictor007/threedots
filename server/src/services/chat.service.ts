import { deleteMediaFile } from '../middleware/upload.middleware.js'
import { randomUUID } from 'node:crypto'
import { db } from '../db/client.js'
import { conversationChannel, getPusherServer } from '../lib/realtime.js'
import type { Message, SendMessageInput } from '../types/index.js'

function mapParticipant(row: {
  participant_id: string
  username: string
  display_name: string
  avatar_color: string
  avatar_url: string | null
  last_seen_at: Date | null
}) {
  return {
    id: row.participant_id,
    username: row.username,
    displayName: row.display_name,
    avatarColor: row.avatar_color,
    avatarUrl: row.avatar_url ?? undefined,
    lastSeenAt: row.last_seen_at?.toISOString(),
  }
}

function previewForMessage(input: SendMessageInput): string {
  if (input.type === 'image') return input.content?.trim() || 'Photo'
  if (input.type === 'voice') return 'Voice message'
  return input.content?.trim() ?? ''
}

type MessageRow = {
  id: string
  conversation_id: string
  sender_id: string
  type: 'text' | 'image' | 'voice'
  content: string
  media_url: string | null
  duration: number | null
  created_at: Date
}

function mapMessage(row: MessageRow): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    type: row.type,
    content: row.content,
    mediaUrl: row.media_url ?? undefined,
    duration: row.duration ?? undefined,
    createdAt: row.created_at.toISOString(),
  }
}

async function canAccessConversation(conversationId: string, userId: string) {
  const result = await db.query(
    `select 1
     from conversation_participants
     where conversation_id = $1 and user_id = $2
     limit 1`,
    [conversationId, userId],
  )
  return (result.rowCount ?? 0) > 0
}

export async function listConversations(userId: string, page: number, limit: number) {
  const offset = (page - 1) * limit
  const result = await db.query<{
    conversation_id: string
    updated_at: Date
    participant_id: string
    username: string
    display_name: string
    avatar_color: string
    avatar_url: string | null
    last_seen_at: Date | null
    message_id: string | null
    sender_id: string | null
    type: 'text' | 'image' | 'voice' | null
    content: string | null
    media_url: string | null
    duration: number | null
    created_at: Date | null
  }>(
    `select
       c.id as conversation_id,
       c.updated_at,
       u.id as participant_id,
       u.username,
       u.display_name,
       u.avatar_color,
       u.avatar_url,
       u.last_seen_at,
       m.id as message_id,
       m.sender_id,
       m.type,
       m.content,
       m.media_url,
       m.duration,
       m.created_at
     from conversations c
     join conversation_participants self_cp
       on self_cp.conversation_id = c.id and self_cp.user_id = $1
     join conversation_participants other_cp
       on other_cp.conversation_id = c.id and other_cp.user_id <> $1
     join users u
       on u.id = other_cp.user_id
     left join lateral (
       select id, sender_id, type, content, media_url, duration, created_at
       from messages
       where conversation_id = c.id
       order by created_at desc
       limit 1
     ) m on true
     order by c.updated_at desc
     limit $2
     offset $3`,
    [userId, limit + 1, offset],
  )

  const hasMore = result.rows.length > limit
  const rows = hasMore ? result.rows.slice(0, limit) : result.rows

  return {
    conversations: rows.map((row) => ({
      id: row.conversation_id,
      participant: mapParticipant(row),
      lastMessage: row.message_id
        ? {
            id: row.message_id,
            conversationId: row.conversation_id,
            senderId: row.sender_id!,
            type: row.type!,
            content: row.content!,
            mediaUrl: row.media_url ?? undefined,
            duration: row.duration ?? undefined,
            createdAt: row.created_at!.toISOString(),
          }
        : null,
      updatedAt: row.updated_at.toISOString(),
    })),
    page,
    limit,
    hasMore,
  }
}

export async function listUsers(currentUserId: string) {
  const result = await db.query<{
    id: string
    username: string
    display_name: string
    avatar_color: string
    avatar_url: string | null
    last_seen_at: Date | null
  }>(
    `select id, username, display_name, avatar_color, avatar_url, last_seen_at
     from users
     where id <> $1 and role <> 'admin'
     order by display_name asc`,
    [currentUserId],
  )

  return {
    users: result.rows.map((row) => ({
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      avatarColor: row.avatar_color,
      avatarUrl: row.avatar_url ?? undefined,
      lastSeenAt: row.last_seen_at?.toISOString(),
    })),
  }
}

export async function getMessages(conversationId: string, userId: string, page: number, limit: number) {
  if (!(await canAccessConversation(conversationId, userId))) {
    return { error: 'Conversation not found' as const }
  }

  const offset = (page - 1) * limit
  const result = await db.query<MessageRow>(
    `select id, conversation_id, sender_id, type, content, media_url, duration, created_at
     from (
       select id, conversation_id, sender_id, type, content, media_url, duration, created_at
       from messages
       where conversation_id = $1
       order by created_at desc
       limit $2
       offset $3
     ) recent
     order by created_at asc`,
    [conversationId, limit + 1, offset],
  )

  const hasMore = result.rows.length > limit
  const rows = hasMore ? result.rows.slice(0, limit) : result.rows
  return {
    messages: rows.map(mapMessage),
    page,
    limit,
    hasMore,
  }
}

export async function sendMessage(conversationId: string, userId: string, input: SendMessageInput) {
  if (!(await canAccessConversation(conversationId, userId))) {
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

  const messageId = randomUUID()
  const content = previewForMessage(input)
  const insert = await db.query<MessageRow>(
    `insert into messages (id, conversation_id, sender_id, type, content, media_url, duration)
     values ($1, $2, $3, $4, $5, $6, $7)
     returning id, conversation_id, sender_id, type, content, media_url, duration, created_at`,
    [messageId, conversationId, userId, type, content, input.mediaUrl ?? null, input.duration ?? null],
  )

  await db.query('update conversations set updated_at = now() where id = $1', [conversationId])

  const message = mapMessage(insert.rows[0])
  const pusher = getPusherServer()
  if (pusher) {
    await pusher.trigger(conversationChannel(conversationId), 'message:new', message)
  }

  return { message }
}

export async function startConversation(userId: string, otherUserId: string) {
  if (userId === otherUserId) {
    return { error: 'Cannot message yourself' as const }
  }

  const otherUser = await db.query<{
    id: string
    username: string
    display_name: string
    avatar_color: string
    avatar_url: string | null
    last_seen_at: Date | null
    role: string
  }>(
    'select id, username, display_name, avatar_color, avatar_url, last_seen_at, role from users where id = $1 limit 1',
    [otherUserId],
  )

  const other = otherUser.rows[0]
  if (!other) {
    return { error: 'User not found' as const }
  }

  if (other.role === 'admin') {
    return { error: 'User not available for messaging' as const }
  }

  const existing = await db.query<{ conversation_id: string }>(
    `select cp1.conversation_id
     from conversation_participants cp1
     join conversation_participants cp2
       on cp2.conversation_id = cp1.conversation_id
     where cp1.user_id = $1 and cp2.user_id = $2
     limit 1`,
    [userId, otherUserId],
  )

  let conversationId = existing.rows[0]?.conversation_id

  if (!conversationId) {
    conversationId = randomUUID()
    await db.query('insert into conversations (id) values ($1)', [conversationId])
    await db.query(
      `insert into conversation_participants (conversation_id, user_id)
       values ($1, $2), ($1, $3)`,
      [conversationId, userId, otherUserId],
    )
  }

  return {
    conversation: {
      id: conversationId,
      participant: {
        id: other.id,
        username: other.username,
        displayName: other.display_name,
        avatarColor: other.avatar_color,
        avatarUrl: other.avatar_url ?? undefined,
        lastSeenAt: other.last_seen_at?.toISOString(),
      },
      lastMessage: null,
      updatedAt: new Date().toISOString(),
    },
  }
}

export async function deleteConversation(conversationId: string, userId: string) {
  if (!(await canAccessConversation(conversationId, userId))) {
    return { error: 'Conversation not found' as const }
  }

  const mediaRows = await db.query<{ media_url: string | null }>(
    'select media_url from messages where conversation_id = $1',
    [conversationId],
  )
  await Promise.all(mediaRows.rows.map((row) => deleteMediaFile(row.media_url ?? undefined)))
  await db.query('delete from conversations where id = $1', [conversationId])

  const pusher = getPusherServer()
  if (pusher) {
    await pusher.trigger(conversationChannel(conversationId), 'conversation:deleted', {
      conversationId,
    })
  }

  return { success: true as const }
}

export async function deleteMessage(conversationId: string, messageId: string, userId: string) {
  if (!(await canAccessConversation(conversationId, userId))) {
    return { error: 'Conversation not found' as const }
  }

  const messageResult = await db.query<{
    sender_id: string
    media_url: string | null
  }>(
    'select sender_id, media_url from messages where id = $1 and conversation_id = $2 limit 1',
    [messageId, conversationId],
  )
  const message = messageResult.rows[0]
  if (!message) {
    return { error: 'Message not found' as const }
  }

  if (message.sender_id !== userId) {
    return { error: 'You can only delete your own messages' as const }
  }

  await db.query('delete from messages where id = $1 and conversation_id = $2', [
    messageId,
    conversationId,
  ])
  await deleteMediaFile(message.media_url ?? undefined)
  await db.query(
    `update conversations
     set updated_at = coalesce(
       (select max(created_at) from messages where conversation_id = $1),
       now()
     )
     where id = $1`,
    [conversationId],
  )

  const pusher = getPusherServer()
  if (pusher) {
    await pusher.trigger(conversationChannel(conversationId), 'message:deleted', {
      conversationId,
      messageId,
    })
  }

  return { success: true as const }
}

export async function sendTyping(conversationId: string, userId: string) {
  if (!(await canAccessConversation(conversationId, userId))) {
    return { error: 'Conversation not found' as const }
  }

  const userResult = await db.query<{ display_name: string }>(
    'select display_name from users where id = $1 limit 1',
    [userId],
  )
  const displayName = userResult.rows[0]?.display_name ?? 'Someone'

  const pusher = getPusherServer()
  if (pusher) {
    await pusher.trigger(conversationChannel(conversationId), 'typing', {
      userId,
      displayName,
    })
  }

  return { success: true as const }
}
