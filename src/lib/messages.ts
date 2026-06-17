import type { Message } from '../types'

export function upsertMessage(messages: Message[], message: Message) {
  return messages.some((m) => m.id === message.id) ? messages : [...messages, message]
}
