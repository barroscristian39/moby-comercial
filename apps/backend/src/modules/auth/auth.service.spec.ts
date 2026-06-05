import { UnauthorizedException } from '@nestjs/common'
import { Role } from '@moby/shared'
import { AuthService } from './auth.service'

describe('AuthService', () => {
  const authRepository = {
    findUserByEmail: jest.fn(),
    findUserById: jest.fn(),
    createRefreshToken: jest.fn(),
    updateLastLogin: jest.fn(),
    revokeActiveLoginVerificationCodes: jest.fn(),
    createLoginVerificationCode: jest.fn(),
    findActiveLoginVerificationCodeById: jest.fn(),
    markLoginVerificationCodeUsed: jest.fn(),
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

  const authEmailService = {
    sendPasswordResetEmail: jest.fn(),
    sendLoginVerificationEmail: jest.fn(),
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
      authEmailService as any,
    )
  })

  it('validates JWT payload under the tenant RLS context', async () => {
    const user = {
      id: 'user-1',
      tenantId: 'tenant-1',
      companyId: null,
      role: Role.TENANT_ADMIN,
      sessionVersion: 0,
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
      sessionVersion: 0,
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
        sessionVersion: 0,
      }),
    ).rejects.toThrow(UnauthorizedException)
  })

  it('rejects revoked sessions when the token version is stale', async () => {
    const user = {
      id: 'user-1',
      tenantId: 'tenant-1',
      companyId: null,
      role: Role.TENANT_ADMIN,
      sessionVersion: 2,
      email: 'admin@moby.test',
      name: 'Admin',
      isActive: true,
      tenant: { status: 'ACTIVE', isActive: true },
      companyAccess: [],
      unitAccess: [],
    }

    authRepository.findUserById.mockResolvedValue(user)
    prismaService.withTenant.mockImplementation(async (_tenantId, _role, handler) => handler())

    await expect(
      service.validateJwtPayload({
        sub: 'user-1',
        typ: 'access',
        tenantId: 'tenant-1',
        role: Role.TENANT_ADMIN,
        sessionVersion: 1,
      }),
    ).rejects.toThrow(UnauthorizedException)
  })

  it('returns null for login when the user does not exist or is inactive', async () => {
    prismaService.withTenant.mockImplementation(async (_tenantId, _role, handler) => handler())
    authRepository.findUserByEmail.mockResolvedValueOnce(null)

    await expect(service.validateUser('missing@moby.test', 'secret')).resolves.toBeNull()

    authRepository.findUserByEmail.mockResolvedValueOnce({
      id: 'user-1',
      tenantId: 'tenant-1',
      role: Role.TENANT_ADMIN,
      isActive: false,
    })

    await expect(service.validateUser('inactive@moby.test', 'secret')).resolves.toBeNull()
  })

  it('returns null for login when tenant access is not usable', async () => {
    prismaService.withTenant.mockImplementation(async (_tenantId, _role, handler) => handler())
    authRepository.findUserByEmail.mockResolvedValue({
      id: 'user-1',
      tenantId: 'tenant-1',
      role: Role.TENANT_ADMIN,
      isActive: true,
      passwordHash: '$scrypt$hash',
    })
    authorizationService.assertTenantIsUsable.mockImplementation(() => {
      throw new UnauthorizedException()
    })

    await expect(service.validateUser('admin@moby.test', 'secret')).resolves.toBeNull()
  })

  it('starts login with an email verification challenge when MFA is enabled', async () => {
    const user = {
      id: 'user-1',
      tenantId: 'tenant-1',
      role: Role.TENANT_ADMIN,
      email: 'admin@moby.test',
      name: 'Admin',
      isActive: true,
      tenant: { status: 'ACTIVE', isActive: true },
      companyAccess: [],
      unitAccess: [],
    }

    prismaService.withTenant.mockImplementation(async (_tenantId, _role, handler) => handler())
    authEmailService.sendLoginVerificationEmail.mockResolvedValue({ delivered: true, provider: 'resend' })

    const result = await service.login(user, { ip: '127.0.0.1', userAgent: 'jest' })

    expect('requiresTwoFactor' in result && result.requiresTwoFactor).toBe(true)
    expect(authRepository.revokeActiveLoginVerificationCodes).toHaveBeenCalledWith('user-1')
    expect(authRepository.createLoginVerificationCode).toHaveBeenCalled()
    expect(authEmailService.sendLoginVerificationEmail).toHaveBeenCalledWith({
      email: 'admin@moby.test',
      name: 'Admin',
      code: expect.stringMatching(/^\d{6}$/),
    })
  })

  it('completes login after a valid email verification code', async () => {
    const user = {
      id: 'user-1',
      tenantId: 'tenant-1',
      companyId: null,
      role: Role.TENANT_ADMIN,
      sessionVersion: 0,
      email: 'admin@moby.test',
      name: 'Admin',
      isActive: true,
      tenant: { status: 'ACTIVE', isActive: true },
      companyAccess: [],
      unitAccess: [],
    }

    prismaService.withTenant.mockImplementation(async (_tenantId, _role, handler) => handler())
    authorizationService.buildAccessContext.mockReturnValue({ menus: [] })
    jwtService.sign.mockReturnValue('access-token')
    authRepository.findActiveLoginVerificationCodeById.mockResolvedValue({
      id: 'challenge-1',
      codeHash: require('crypto').createHash('sha256').update('challenge-1:123456').digest('hex'),
      user,
    })

    const result = await service.verifyLoginCode('challenge-1', '123456', { ip: '127.0.0.1', userAgent: 'jest' })

    expect(authRepository.markLoginVerificationCodeUsed).toHaveBeenCalledWith('challenge-1')
    expect(authRepository.updateLastLogin).toHaveBeenCalledWith('user-1')
    expect(result.accessToken).toBe('access-token')
    expect(result.user.email).toBe('admin@moby.test')
  })
})
