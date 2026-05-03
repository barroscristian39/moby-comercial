import { NotificationFilter, NotificationType, SingleResponse } from '@moby/shared'
import { api } from '@/lib/api'

export interface NotificationItem {
  id: string
  tenantId: string | null
  companyId: string | null
  userId: string
  title: string
  message: string
  type: NotificationType
  link: string | null
  metadata: unknown | null
  isRead: boolean
  readAt: string | null
  createdAt: string
  updatedAt: string
}

export interface NotificationSummary {
  total: number
  unreadCount: number
  readCount: number
}

export interface NotificationsResponse {
  data: NotificationItem[]
  meta: {
    total: number
    page: number
    perPage: number
    totalPages: number
    unreadCount: number
    readCount: number
  }
}

export const notificationsApi = {
  findAll: async (params?: { page?: number; perPage?: number; filter?: NotificationFilter }) => {
    const { data } = await api.get('/notifications', { params })
    return data as NotificationsResponse
  },

  getSummary: async () => {
    const { data } = await api.get('/notifications/summary')
    return (data as SingleResponse<NotificationSummary>).data
  },

  markAsRead: async (id: string) => {
    const { data } = await api.patch(`/notifications/${id}/read`)
    return (data as SingleResponse<NotificationItem>).data
  },

  markAllAsRead: async () => {
    const { data } = await api.patch('/notifications/read-all')
    return (data as SingleResponse<{ updatedCount: number }>).data
  },
}
