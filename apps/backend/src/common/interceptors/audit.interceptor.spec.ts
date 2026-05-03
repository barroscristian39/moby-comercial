import { ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { of, lastValueFrom } from 'rxjs'
import { AuditInterceptor } from './audit.interceptor'

describe('AuditInterceptor', () => {
  const auditService = {
    record: jest.fn(),
  }

  const reflector = {
    getAllAndOverride: jest.fn(),
  }

  const next = {
    handle: jest.fn(),
  }

  let interceptor: AuditInterceptor

  beforeEach(() => {
    jest.resetAllMocks()
    interceptor = new AuditInterceptor(auditService as any, reflector as unknown as Reflector)
  })

  it('skips generic audit when controller declares manual audit', async () => {
    reflector.getAllAndOverride.mockReturnValue(true)
    next.handle.mockReturnValue(of({ data: { id: 'company-1' } }))

    const result = await lastValueFrom(interceptor.intercept(createHttpContext(), next as any))

    expect(result).toEqual({ data: { id: 'company-1' } })
    expect(auditService.record).not.toHaveBeenCalled()
  })

  it('records generic audit when manual audit is not enabled', async () => {
    reflector.getAllAndOverride.mockReturnValue(false)
    auditService.record.mockResolvedValue(undefined)
    next.handle.mockReturnValue(of({ data: { id: 'risk-1', tenantId: 'tenant-1' } }))

    await lastValueFrom(interceptor.intercept(createHttpContext(), next as any))
    await Promise.resolve()

    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        actorUserId: 'user-1',
        action: 'CREATE',
        entityType: 'risks',
        entityId: 'risk-1',
      }),
    )
  })
})

function createHttpContext(): ExecutionContext {
  const request = {
    method: 'POST',
    url: '/api/risks',
    user: {
      userId: 'user-1',
      tenantId: 'tenant-1',
    },
    ip: '127.0.0.1',
    headers: {
      'user-agent': 'jest',
    },
    body: { name: 'Teste' },
    params: {},
  }

  return {
    getType: () => 'http',
    getHandler: () => function handler() {},
    getClass: () => class TestController {},
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
      getNext: () => undefined,
    }),
  } as unknown as ExecutionContext
}
