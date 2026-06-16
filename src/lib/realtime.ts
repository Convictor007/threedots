import Pusher from 'pusher-js'
import { getToken } from '../api/client'

let pusherClient: Pusher | null = null

export function getPusherClient() {
  if (pusherClient) return pusherClient

  const key = import.meta.env.VITE_PUSHER_KEY as string | undefined
  const cluster = import.meta.env.VITE_PUSHER_CLUSTER as string | undefined

  if (!key || !cluster) return null

  pusherClient = new Pusher(key, {
    cluster,
    channelAuthorization: {
      endpoint: '/api/realtime/auth',
      headers: {
        Authorization: `Bearer ${getToken() ?? ''}`,
      },
      transport: 'ajax',
    },
  })

  return pusherClient
}

export function conversationChannel(conversationId: string) {
  return `private-conversation-${conversationId}`
}
