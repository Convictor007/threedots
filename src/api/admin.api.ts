import { apiClient } from './client'
import type { AdminDashboardStats, AdminUser, UserRole } from '../types'

export const adminApi = {
  getStats: () => apiClient.get<{ stats: AdminDashboardStats }>('/admin/stats'),
  getUsers: () => apiClient.get<{ users: AdminUser[] }>('/admin/users'),
  revokeSessions: (userId: string) =>
    apiClient.delete<{ revokedSessions: number }>(`/admin/users/${userId}/sessions`),
  updateRole: (userId: string, role: UserRole) =>
    apiClient.patch<{ user: AdminUser }>(`/admin/users/${userId}/role`, { role }),
}
