import { Controller, Get, Query } from '@nestjs/common'
import { z } from 'zod'
import { PaginationSchema, Permission, RequestUser } from '@moby/shared'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { ZodPipe } from '../../common/pipes/zod.pipe'
import { AuditService } from './audit.service'

const AuditQuerySchema = PaginationSchema.extend({
  tenantId: z.string().uuid().optional(),
  entityType: z.string().min(1).max(80).optional(),
  actorUserId: z.string().uuid().optional(),
})

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @RequirePermissions(Permission.AUDIT_READ)
  @Get()
  findAll(
    @CurrentUser() user: RequestUser,
    @Query(new ZodPipe(AuditQuerySchema)) query: z.infer<typeof AuditQuerySchema>,
  ) {
    const { page, perPage, tenantId, entityType, actorUserId } = query
    return this.auditService.findAll(user, { page, perPage }, { tenantId, entityType, actorUserId })
  }
}
