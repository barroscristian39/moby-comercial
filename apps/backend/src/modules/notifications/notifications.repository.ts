import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { NotificationFilter, NotificationType } from '@moby/shared'
import { PrismaService } from '../../database/prisma.service'

type CreateNotificationInput = {
  tenantId?: string | null
  companyId?: string | null
  userId: string
  title: string
  message: string
  type?: NotificationType
  link?: string | null
  metadata?: Prisma.InputJsonValue
}

@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: {
    userId: string
    page: number
    perPage: number
    filter: NotificationFilter
  }) {
    const where = this.buildWhere(params.userId, params.filter)

    const [items, total, unreadCount, readCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: this.buildWhere(params.userId, NotificationFilter.UNREAD),
      }),
      this.prisma.notification.count({
        where: this.buildWhere(params.userId, NotificationFilter.READ),
      }),
    ])

    return { items, total, unreadCount, readCount }
  }

  async getSummary(userId: string) {
    const [total, unreadCount, readCount] = await Promise.all([
      this.prisma.notification.count({
        where: this.buildWhere(userId, NotificationFilter.ALL),
      }),
      this.prisma.notification.count({
        where: this.buildWhere(userId, NotificationFilter.UNREAD),
      }),
      this.prisma.notification.count({
        where: this.buildWhere(userId, NotificationFilter.READ),
      }),
    ])

    return { total, unreadCount, readCount }
  }

  findByIdForUser(id: string, userId: string) {
    return this.prisma.notification.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
        isActive: true,
      },
    })
  }

  markAsRead(id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: this.buildWhere(userId, NotificationFilter.UNREAD),
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })

    return result.count
  }

  create(input: CreateNotificationInput) {
    return this.prisma.notification.create({
      data: {
        tenantId: input.tenantId ?? null,
        companyId: input.companyId ?? null,
        userId: input.userId,
        title: input.title,
        message: input.message,
        type: input.type ?? NotificationType.INFO,
        link: input.link ?? null,
        metadata: input.metadata,
      },
    })
  }

  private buildWhere(userId: string, filter: NotificationFilter): Prisma.NotificationWhereInput {
    return {
      userId,
      deletedAt: null,
      isActive: true,
      ...(filter === NotificationFilter.READ ? { isRead: true } : {}),
      ...(filter === NotificationFilter.UNREAD ? { isRead: false } : {}),
    }
  }
}
