import { UnauthorizedException } from '@nestjs/common'
import { Role } from '@moby/shared'
import { AuthService } from './auth.service'

describe('AuthService', () => {
  const authRepository = {
    findUserById: jest.fn(),
  }

  const jwtService = {
    sign: jest.fn(),
  }

  const passwordService = {
    normalizeEmail: jest.fn((value: string) => value),
    verify: jest.fn(),
    hash: jest.fn(),
  }

  const authorizationService = {
    assertTenantIsUsable: jest.fn(),
    permissionsForRole: jest.fn(() => []),
    expandScopeForAdmin: jest.fn(async (user) => user),
    buildAccessContext: jest.fn(),
  }

  const prismaService = {
    withTenant: jest.fn(),
  }

  const auditService = {
    record: jest.fn(),
  }

  let service: AuthService

  beforeEach(() => {
    jest.resetAllMocks()
    authorizationService.permissionsForRole.mockImplementation(() => [])
    authorizationService.expandScopeForAdmin.mockImplementation(async (user) => user)
    passwordService.normalizeEmail.mockImplementation((value: string) => value)
    service = new AuthService(
      authRepository as any,
      jwtService as any,
      passwordService as any,
      authorizationService as any,
      prismaService as any,
      auditService as any,
    )
  })

  it('validates JWT payload under the tenant RLS context', async () => {
    const user = {
      id: 'user-1',
      tenantId: 'tenant-1',
      companyId: null,
      role: Role.TENANT_ADMIN,
      email: 'admin@moby.test',
      name: 'Admin',
      isActive: true,
      tenant: { status: 'ACTIVE', isActive: true },
      companyAccess: [],
      unitAccess: [],
    }

    authRepository.findUserById.mockResolvedValue(user)
    prismaService.withTenant.mockImplementation(async (_tenantId, _role, handler) => handler())

    const requestUser = await service.validateJwtPayload({
      sub: 'user-1',
      typ: 'access',
      tenantId: 'tenant-1',
      role: Role.TENANT_ADMIN,
    })

    expect(prismaService.withTenant).toHaveBeenCalledWith(
      'tenant-1',
      Role.TENANT_ADMIN,
      expect.any(Function),
    )
    expect(requestUser.userId).toBe('user-1')
    expect(authorizationService.assertTenantIsUsable).toHaveBeenCalledWith(user)
  })

  it('rejects inactive users resolved from the JWT payload', async () => {
    authRepository.findUserById.mockResolvedValue(null)
    prismaService.withTenant.mockImplementation(async (_tenantId, _role, handler) => handler())

    await expect(
      service.validateJwtPayload({
        sub: 'user-1',
        typ: 'access',
        tenantId: 'tenant-1',
        role: Role.TENANT_ADMIN,
      }),
    ).rejects.toThrow(UnauthorizedException)
  })
})
