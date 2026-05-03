import { Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { NotificationType, RequestUser } from '@moby/shared'
import { ListNotificationsDto } from './dto/list-notifications.dto'
import { NotificationEntity } from './entities/notification.entity'
import { NotificationsRepository } from './notifications.repository'

@Injectable()
export class NotificationsService {
  constructor(private readonly notificationsRepository: NotificationsRepository) {}

  async findAll(currentUser: RequestUser, query: ListNotificationsDto) {
    const { items, total, unreadCount, readCount } = await this.notificationsRepository.findAll({
      userId: currentUser.userId,
      page: query.page,
      perPage: query.perPage,
      filter: query.filter,
    })

    return {
      data: items.map(this.mapToEntity),
      meta: {
        total,
        page: query.page,
        perPage: query.perPage,
        totalPages: Math.ceil(total / query.perPage),
        unreadCount,
        readCount,
      },
    }
  }

  async getSummary(currentUser: RequestUser) {
    return {
      data: await this.notificationsRepository.getSummary(currentUser.userId),
    }
  }

  async markAsRead(id: string, currentUser: RequestUser) {
    const notification = await this.notificationsRepository.findByIdForUser(id, currentUser.userId)
    if (!notification) {
      throw new NotFoundException({
        error: { code: 'NOTIFICATION_NOT_FOUND', message: 'Notificação não encontrada', statusCode: 404 },
      })
    }

    const updated = notification.isRead
      ? notification
      : await this.notificationsRepository.markAsRead(id)

    return { data: this.mapToEntity(updated) }
  }

  async markAllAsRead(currentUser: RequestUser) {
    const updatedCount = await this.notificationsRepository.markAllAsRead(currentUser.userId)

    return {
      data: { updatedCount },
    }
  }

  async createSystemNotification(params: {
    tenantId?: string | null
    companyId?: string | null
    userId: string
    title: string
    message: string
    type?: NotificationType
    link?: string | null
    metadata?: Prisma.InputJsonValue
  }) {
    const notification = await this.notificationsRepository.create({
      ...params,
    })

    return { data: this.mapToEntity(notification) }
  }

  private mapToEntity(notification: any): NotificationEntity {
    return {
      id: notification.id,
      tenantId: notification.tenantId ?? null,
      companyId: notification.companyId ?? null,
      userId: notification.userId,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      link: notification.link ?? null,
      metadata: notification.metadata ?? null,
      isRead: notification.isRead,
      readAt: notification.readAt ?? null,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
    }
  }
}
