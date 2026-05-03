import { Injectable } from '@nestjs/common'
import { AuditAction, Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'

@Injectable()
export class AuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    tenantId?: string | null
    actorUserId?: string | null
    action: AuditAction
    entityType: string
    entityId?: string | null
    metadata?: any
    ip?: string | null
    userAgent?: string | null
  }) {
    return this.prisma.auditLog.create({ data: data as Prisma.AuditLogCreateInput })
  }

  async findAll(params: {
    tenantId?: string
    page: number
    perPage: number
    entityType?: string
    actorUserId?: string
  }) {
    const where: Prisma.AuditLogWhereInput = {
      ...(params.tenantId ? { tenantId: params.tenantId } : {}),
      ...(params.entityType ? { entityType: params.entityType } : {}),
      ...(params.actorUserId ? { actorUserId: params.actorUserId } : {}),
    }

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ])

    return { items, total }
  }
}
