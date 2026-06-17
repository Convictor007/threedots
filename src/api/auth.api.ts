import { apiClient } from './client'
import type { AuthResponse, User } from '../types'

export const AVATAR_COLORS = ['#2d6a4f', '#40916c', '#52b788', '#74c69d', '#95d5b2', '#1b4332']

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

  updateProfile(input: {
    displayName?: string
    avatarColor?: string
    avatarUrl?: string | null
  }) {
    return apiClient.patch<{ user: User }>('/auth/profile', input)
  },

  updateUsername(username: string, currentPassword: string) {
    return apiClient.patch<{ user: User }>('/auth/username', { username, currentPassword })
  },

  updatePassword(currentPassword: string, newPassword: string) {
    return apiClient.patch<{ user: User }>('/auth/password', { currentPassword, newPassword })
  },

  heartbeat() {
    return apiClient.post<{ success: boolean }>('/auth/heartbeat')
  },

  logout() {
    return apiClient.post<{ success: boolean }>('/auth/logout')
  },
}
