import { ExecutionContext } from '@nestjs/common'
import { RequestUser, Role } from '@moby/shared'
import { of, lastValueFrom } from 'rxjs'
import { TenantContextInterceptor } from './tenant-context.interceptor'

describe('TenantContextInterceptor', () => {
  const prisma = {
    runWithRequestContext: jest.fn(),
  }

  const next = {
    handle: jest.fn(),
  }

  let interceptor: TenantContextInterceptor

  beforeEach(() => {
    jest.resetAllMocks()
    interceptor = new TenantContextInterceptor(prisma as any)
  })

  it('wraps authenticated requests with tenant and role context', async () => {
    const user: RequestUser = {
      userId: 'user-1',
      tenantId: 'tenant-1',
      companyId: null,
      role: Role.TENANT_ADMIN,
      companyIds: [],
      unitIds: [],
      permissions: [],
    }

    prisma.runWithRequestContext.mockImplementation(async (_params, handler) => handler())
    next.handle.mockReturnValue(of({ ok: true }))

    const context = createHttpContext(user)
    const result = await lastValueFrom(interceptor.intercept(context, next as any))

    expect(prisma.runWithRequestContext).toHaveBeenCalledWith(
      { tenantId: 'tenant-1', role: Role.TENANT_ADMIN },
      expect.any(Function),
    )
    expect(result).toEqual({ ok: true })
  })

  it('skips context setup for public requests without authenticated user', async () => {
    next.handle.mockReturnValue(of({ ok: true }))

    const context = createHttpContext(undefined)
    const result = await lastValueFrom(interceptor.intercept(context, next as any))

    expect(prisma.runWithRequestContext).not.toHaveBeenCalled()
    expect(result).toEqual({ ok: true })
  })
})

function createHttpContext(user?: RequestUser): ExecutionContext {
  return {
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => ({ user }),
      getResponse: () => ({}),
      getNext: () => undefined,
    }),
  } as ExecutionContext
}
