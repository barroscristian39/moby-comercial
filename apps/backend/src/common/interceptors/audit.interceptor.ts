import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AuditAction } from '@prisma/client'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'
import { MANUAL_AUDIT_KEY } from '../decorators/manual-audit.decorator'
import { AuditService } from '../../modules/audit/audit.service'

const METHOD_ACTION_MAP: Record<string, AuditAction> = {
  POST: AuditAction.CREATE,
  PUT: AuditAction.UPDATE,
  PATCH: AuditAction.UPDATE,
  DELETE: AuditAction.DELETE,
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name)

  constructor(
    private readonly auditService: AuditService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') return next.handle()

    const usesManualAudit = this.reflector.getAllAndOverride<boolean>(MANUAL_AUDIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (usesManualAudit) return next.handle()

    const request = context.switchToHttp().getRequest()
    const action = METHOD_ACTION_MAP[request.method]
    if (!action) return next.handle()

    const entityType = this.extractEntity(request.url)
    if (entityType === 'auth') return next.handle()

    const user = request.user
    const ip = request.ip || request.headers['x-forwarded-for'] || 'unknown'
    const userAgent = request.headers['user-agent']

    return next.handle().pipe(
      tap({
        next: async (responseData) => {
          try {
            const data = responseData?.data ?? responseData
            const entityId = data?.id ?? request.params?.id ?? undefined

            await this.auditService.record({
              tenantId: user?.tenantId ?? data?.tenantId ?? undefined,
              actorUserId: user?.userId ?? undefined,
              action,
              entityType,
              entityId,
              metadata: {
                route: request.url,
                method: request.method,
                body: request.body,
                response: data,
              },
              ip: Array.isArray(ip) ? ip[0] : String(ip),
              userAgent,
            })
          } catch (error) {
            this.logger.error('Failed to write audit log', error)
          }
        },
      }),
    )
  }

  private extractEntity(url: string): string {
    const parts = url.replace(/^\/api\//, '').split('/')
    return parts[0] || 'unknown'
  }
}
