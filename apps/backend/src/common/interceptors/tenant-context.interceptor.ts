import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { RequestUser } from '@moby/shared'
import { Observable, from, lastValueFrom } from 'rxjs'
import { PrismaService } from '../../database/prisma.service'

@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') {
      return next.handle()
    }

    const request = context.switchToHttp().getRequest<{ user?: RequestUser }>()
    const user = request.user

    if (!user?.role) {
      return next.handle()
    }

    return from(
      this.prisma.runWithRequestContext(
        {
          tenantId: user.tenantId ?? null,
          role: String(user.role),
        },
        () => lastValueFrom(next.handle()),
      ),
    )
  }
}
