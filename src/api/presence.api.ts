import { apiClient } from './client'
import type { User } from '../types'

export const presenceApi = {
  getUsers(userIds: string[]) {
    if (!userIds.length) return Promise.resolve({ users: [] as User[] })
    return apiClient.get<{ users: User[] }>(`/presence/users?userIds=${userIds.join(',')}`)
  },

  heartbeat() {
    return apiClient.post<{ success: boolean }>('/presence/heartbeat')
  },
}
