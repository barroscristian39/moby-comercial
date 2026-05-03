import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ROLES_KEY } from '../decorators/roles.decorator'
import { Role } from '@moby/shared'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) return true

    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (!requiredRoles || requiredRoles.length === 0) return true

    const { user } = context.switchToHttp().getRequest()

    if (!user) {
      throw new ForbiddenException({
        error: { code: 'FORBIDDEN', message: 'Acesso negado', statusCode: 403 },
      })
    }

    if (user.role === Role.SUPER_ADMIN) return true
    if (
      user.role === Role.TENANT_ADMIN &&
      !requiredRoles.every((role) => role === Role.SUPER_ADMIN)
    ) {
      return true
    }

    const hasRole = requiredRoles.includes(user.role)
    if (!hasRole) {
      throw new ForbiddenException({
        error: { code: 'FORBIDDEN', message: 'Perfil sem permissão para esta ação', statusCode: 403 },
      })
    }

    return true
  }
}
