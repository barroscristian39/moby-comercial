import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Role } from '@moby/shared'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'

@Injectable()
export class ScopeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) return true

    const request = context.switchToHttp().getRequest()
    const user = request.user

    if (!user) return false
    if (user.role === Role.SUPER_ADMIN) return true

    const tenantId = request.params?.tenantId || request.body?.tenantId || request.query?.tenantId
    if (tenantId && tenantId !== user.tenantId) {
      this.deny('Acesso fora do ambiente autenticado')
    }

    const companyId = request.params?.companyId || request.body?.companyId || request.query?.companyId
    const companyIds = Array.from(new Set([
      ...(user.companyIds ?? []),
      ...(user.companyId ? [user.companyId] : []),
    ]))
    if (companyId && companyIds.length > 0 && !companyIds.includes(companyId) && user.role !== Role.TENANT_ADMIN) {
      this.deny('Acesso fora do escopo de empresa')
    }

    const unitId = request.params?.unitId || request.body?.unitId || request.query?.unitId
    const unitIds = user.unitIds ?? []
    if (unitId && unitIds.length > 0 && !unitIds.includes(unitId) && user.role !== Role.TENANT_ADMIN) {
      this.deny('Acesso fora do escopo de unidade')
    }

    return true
  }

  private deny(message: string): never {
    throw new ForbiddenException({
      error: { code: 'FORBIDDEN_SCOPE', message, statusCode: 403 },
    })
  }
}
