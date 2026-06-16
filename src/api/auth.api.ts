import { apiClient } from './client'
import type { AuthResponse, User } from '../types'

export const authApi = {
  login(username: string, password: string) {
    return apiClient.post<AuthResponse>('/auth/login', { username, password })
  },

  register(username: string, displayName: string, password: string) {
    return apiClient.post<AuthResponse>('/auth/register', {
      username,
      displayName,
      password,
    })
  },

  me() {
    return apiClient.get<{ user: User }>('/auth/me')
  },

  logout() {
    return apiClient.post<{ success: boolean }>('/auth/logout')
  },
}
