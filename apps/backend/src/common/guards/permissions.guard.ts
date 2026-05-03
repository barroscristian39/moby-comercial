import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Permission, Role } from '@moby/shared'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator'

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) return true

    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (!requiredPermissions || requiredPermissions.length === 0) return true

    const { user } = context.switchToHttp().getRequest()
    if (!user) {
      throw new ForbiddenException({
        error: { code: 'FORBIDDEN', message: 'Acesso negado', statusCode: 403 },
      })
    }

    if (user.role === Role.SUPER_ADMIN) return true

    const granted = new Set(user.permissions ?? [])
    const allowed = requiredPermissions.every((permission) => granted.has(permission))

    if (!allowed) {
      throw new ForbiddenException({
        error: {
          code: 'MISSING_PERMISSION',
          message: 'Permissão insuficiente para executar esta ação',
          statusCode: 403,
        },
      })
    }

    return true
  }
}
