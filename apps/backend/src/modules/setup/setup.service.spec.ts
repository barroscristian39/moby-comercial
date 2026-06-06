import { ConflictException, ForbiddenException } from '@nestjs/common'
import { SetupService } from './setup.service'

describe('SetupService', () => {
  const repository = {
    countUsers: jest.fn(),
    createBootstrapSuperAdmin: jest.fn(),
  }
  const passwordService = {
    hash: jest.fn(),
    normalizeEmail: jest.fn((value: string) => value.trim().toLowerCase()),
  }
  const prismaService = {
    withTenant: jest.fn(async (_tenantId: string | null, _actor: string, callback: () => unknown) => await callback()),
  }

  let service: SetupService
  const originalEnv = { ...process.env }

  beforeEach(() => {
    jest.resetAllMocks()
    process.env = { ...originalEnv }
    prismaService.withTenant.mockImplementation(
      async (_tenantId: string | null, _actor: string, callback: () => unknown) => await callback(),
    )
    passwordService.normalizeEmail.mockImplementation((value: string) => value.trim().toLowerCase())
    service = new SetupService(repository as any, passwordService as any, prismaService as any)
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('reports bootstrap as disabled by default in production', async () => {
    process.env.NODE_ENV = 'production'
    delete process.env.ALLOW_BOOTSTRAP
    repository.countUsers.mockResolvedValue(0)

    await expect(service.getStatus()).resolves.toEqual({
      data: {
        requiresBootstrap: true,
        bootstrapEnabled: false,
      },
    })
  })

  it('keeps bootstrap enabled by default outside production', async () => {
    process.env.NODE_ENV = 'development'
    delete process.env.ALLOW_BOOTSTRAP
    repository.countUsers.mockResolvedValue(0)

    await expect(service.getStatus()).resolves.toEqual({
      data: {
        requiresBootstrap: true,
        bootstrapEnabled: true,
      },
    })
  })

  it('does not expose bootstrap as enabled after the first user exists', async () => {
    process.env.NODE_ENV = 'production'
    process.env.ALLOW_BOOTSTRAP = 'true'
    repository.countUsers.mockResolvedValue(2)

    await expect(service.getStatus()).resolves.toEqual({
      data: {
        requiresBootstrap: false,
        bootstrapEnabled: false,
      },
    })
  })

  it('blocks public bootstrap when the environment flag is disabled', async () => {
    process.env.NODE_ENV = 'production'
    process.env.ALLOW_BOOTSTRAP = 'false'
    repository.countUsers.mockResolvedValue(0)

    await expect(
      service.bootstrap({
        name: 'Admin',
        email: 'admin@example.com',
        password: 'StrongPassword123!',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException)

    expect(passwordService.hash).not.toHaveBeenCalled()
    expect(repository.createBootstrapSuperAdmin).not.toHaveBeenCalled()
  })

  it('creates the first super admin when bootstrap is enabled', async () => {
    process.env.NODE_ENV = 'production'
    process.env.ALLOW_BOOTSTRAP = 'true'
    repository.countUsers.mockResolvedValue(0)
    passwordService.hash.mockResolvedValue('hashed-password')
    repository.createBootstrapSuperAdmin.mockResolvedValue({
      id: 'user-1',
      name: 'Admin',
      email: 'admin@example.com',
      role: 'SUPER_ADMIN',
    })

    const result = await service.bootstrap({
      name: 'Admin',
      email: 'ADMIN@EXAMPLE.COM',
      password: 'StrongPassword123!',
    })

    expect(passwordService.hash).toHaveBeenCalledWith('StrongPassword123!')
    expect(repository.createBootstrapSuperAdmin).toHaveBeenCalledWith({
      name: 'Admin',
      email: 'admin@example.com',
      passwordHash: 'hashed-password',
    })
    expect(result.data.email).toBe('admin@example.com')
  })

  it('returns conflict when bootstrap has already been completed', async () => {
    process.env.NODE_ENV = 'production'
    process.env.ALLOW_BOOTSTRAP = 'true'
    repository.countUsers.mockResolvedValue(1)

    await expect(
      service.bootstrap({
        name: 'Admin',
        email: 'admin@example.com',
        password: 'StrongPassword123!',
      }),
    ).rejects.toBeInstanceOf(ConflictException)
  })
})
