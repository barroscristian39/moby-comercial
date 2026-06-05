import { ForbiddenException, Injectable, Logger } from '@nestjs/common'
import { AuditAction, Prisma } from '@prisma/client'
import { PaginationDto, RequestUser, Role } from '@moby/shared'
import { AuditRepository } from './audit.repository'

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /authorization/i,
  /cookie/i,
  /cpf/i,
  /email/i,
  /phone/i,
  /salary/i,
  /birthdate/i,
  /medical/i,
  /witness/i,
  /immediatecause/i,
  /rootcause/i,
  /conclusionsummary/i,
  /recommendation/i,
  /managernotes/i,
  /description/i,
  /occurrenceaddress/i,
  /filecontent/i,
]

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name)

  constructor(private readonly auditRepository: AuditRepository) {}

  async record(data: {
    tenantId?: string | null
    actorUserId?: string | null
    action: AuditAction
    entityType: string
    entityId?: string | null
    metadata?: any
    ip?: string | null
    userAgent?: string | null
  }) {
    try {
      await this.auditRepository.create({
        ...data,
        metadata: data.metadata ? this.redactSensitive(data.metadata) : undefined,
      })
    } catch (error) {
      this.logger.error('Failed to persist audit log', error)
    }
  }

  async findAll(
    currentUser: RequestUser,
    pagination: PaginationDto,
    filters: { tenantId?: string; entityType?: string; actorUserId?: string },
  ) {
    const tenantId = currentUser.role === Role.SUPER_ADMIN ? filters.tenantId : currentUser.tenantId
    if (currentUser.role !== Role.SUPER_ADMIN && !tenantId) {
      throw new ForbiddenException({
        error: { code: 'FORBIDDEN', message: 'Usuário sem ambiente associado', statusCode: 403 },
      })
    }

    const { items, total } = await this.auditRepository.findAll({
      tenantId: tenantId ?? undefined,
      page: pagination.page,
      perPage: pagination.perPage,
      entityType: filters.entityType,
      actorUserId: filters.actorUserId,
    })

    return {
      data: items,
      meta: {
        total,
        page: pagination.page,
        perPage: pagination.perPage,
        totalPages: Math.ceil(total / pagination.perPage),
      },
    }
  }

  redactSensitive(value: any): Prisma.InputJsonValue {
    if (value instanceof Date) {
      return value.toISOString()
    }

    if (typeof value === 'bigint') {
      return value.toString()
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.redactSensitive(item)) as Prisma.InputJsonArray
    }

    if (value && typeof value === 'object') {
      const result: Record<string, Prisma.InputJsonValue> = {}
      for (const [key, nested] of Object.entries(value)) {
        if (SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key))) {
          result[key] = '[REDACTED]'
          continue
        }
        result[key] = this.redactSensitive(nested)
      }
      return result
    }

    return value
  }
}
