import Pusher from 'pusher'

let pusherServer: Pusher | null = null

export function getPusherServer() {
  if (pusherServer) return pusherServer

  const appId = process.env.PUSHER_APP_ID
  const key = process.env.PUSHER_KEY
  const secret = process.env.PUSHER_SECRET
  const cluster = process.env.PUSHER_CLUSTER

  if (!appId || !key || !secret || !cluster) {
    return null
  }

  pusherServer = new Pusher({
    appId,
    key,
    secret,
    cluster,
    useTLS: true,
  })

  return pusherServer
}

export function conversationChannel(conversationId: string) {
  return `private-conversation-${conversationId}`
}

export const PRESENCE_USERS_CHANNEL = 'presence-users'
