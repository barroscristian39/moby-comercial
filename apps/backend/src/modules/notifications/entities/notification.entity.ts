import { NotificationType } from '@moby/shared'

export interface NotificationEntity {
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
  readAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface NotificationSummaryEntity {
  total: number
  unreadCount: number
  readCount: number
}
