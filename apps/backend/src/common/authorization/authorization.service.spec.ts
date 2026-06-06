import { ForbiddenException, UnauthorizedException } from '@nestjs/common'
import { Permission, Role, TenantStatus } from '@moby/shared'
import { AuthorizationService } from './authorization.service'

describe('AuthorizationService', () => {
  const repository = {
    findTenantById: jest.fn(),
    findCompanyScope: jest.fn(),
    findUnitScope: jest.fn(),
    listCompanyIdsForTenant: jest.fn(),
    listUnitIdsForTenant: jest.fn(),
    listAllCompanyIds: jest.fn(),
    listAllUnitIds: jest.fn(),
    countCompaniesOutsideTenant: jest.fn(),
    countUnitsOutsideTenant: jest.fn(),
    countUnitsOutsideCompanies: jest.fn(),
  }

  let service: AuthorizationService

  beforeEach(() => {
    jest.resetAllMocks()
    service = new AuthorizationService(repository as any)
  })

  it('blocks users when the tenant is suspended', () => {
    expect(() =>
      service.assertTenantIsUsable({
        role: Role.TECNICO_SST,
        tenantId: 'tenant-a',
        tenant: { status: TenantStatus.SUSPENDED, isActive: false },
      }),
    ).toThrow(UnauthorizedException)
  })

  it('denies cross-tenant company access by default', async () => {
    repository.findCompanyScope.mockResolvedValue({
      id: 'company-b',
      tenantId: 'tenant-b',
      isActive: true,
    })

    await expect(
      service.assertCompanyAccess(
        {
          userId: 'user-a',
          tenantId: 'tenant-a',
          companyId: 'company-a',
          role: Role.TECNICO_SST,
          companyIds: ['company-a'],
          unitIds: [],
          permissions: [],
        },
        'company-b',
      ),
    ).rejects.toThrow(ForbiddenException)
  })

  it('allows operational users only for explicitly linked companies', async () => {
    repository.findCompanyScope.mockResolvedValue({
      id: 'company-a',
      tenantId: 'tenant-a',
      isActive: true,
    })

    await expect(
      service.assertCompanyAccess(
        {
          userId: 'user-a',
          tenantId: 'tenant-a',
          companyId: 'company-a',
          role: Role.TECNICO_SST,
          companyIds: ['company-a'],
          unitIds: [],
          permissions: [],
        },
        'company-a',
      ),
    ).resolves.toBeUndefined()
  })

  it('falls back to the primary company when explicit companyIds are empty', () => {
    expect(
      service.resolveCompanyScope({
        userId: 'user-a',
        tenantId: 'tenant-a',
        companyId: 'company-a',
        role: Role.TECNICO_SST,
        companyIds: [],
        unitIds: ['unit-a'],
        permissions: [],
      }),
    ).toEqual(['company-a'])
  })

  it('returns an empty company scope instead of broadening tenant access', () => {
    expect(
      service.resolveCompanyScope({
        userId: 'user-a',
        tenantId: 'tenant-a',
        companyId: null,
        role: Role.TECNICO_SST,
        companyIds: [],
        unitIds: ['unit-a'],
        permissions: [],
      }),
    ).toEqual([])
  })

  it('returns an empty unit scope instead of broadening tenant access', () => {
    expect(
      service.resolveUnitScope({
        userId: 'user-a',
        tenantId: 'tenant-a',
        companyId: 'company-a',
        role: Role.TECNICO_SST,
        companyIds: ['company-a'],
        unitIds: [],
        permissions: [],
      }),
    ).toEqual([])
  })

  it('denies direct company access when the operational scope is empty', () => {
    expect(() =>
      service.assertCompanyInScope(
        {
          userId: 'user-a',
          tenantId: 'tenant-a',
          companyId: null,
          role: Role.TECNICO_SST,
          companyIds: [],
          unitIds: ['unit-a'],
          permissions: [],
        },
        'company-a',
      ),
    ).toThrow(ForbiddenException)
  })

  it('denies direct unit access when the operational scope is empty', () => {
    expect(() =>
      service.assertUnitInScope(
        {
          userId: 'user-a',
          tenantId: 'tenant-a',
          companyId: 'company-a',
          role: Role.TECNICO_SST,
          companyIds: ['company-a'],
          unitIds: [],
          permissions: [],
        },
        'unit-a',
      ),
    ).toThrow(ForbiddenException)
  })

  it('expands tenant admin scope to every company and unit in its tenant', async () => {
    repository.listCompanyIdsForTenant.mockResolvedValue(['company-a', 'company-b'])
    repository.listUnitIdsForTenant.mockResolvedValue(['unit-a', 'unit-b'])

    const expanded = await service.expandScopeForAdmin({
      userId: 'admin-a',
      tenantId: 'tenant-a',
      companyId: null,
      role: Role.TENANT_ADMIN,
      companyIds: [],
      unitIds: [],
      permissions: [],
    })

    expect(expanded.companyIds).toEqual(['company-a', 'company-b'])
    expect(expanded.unitIds).toEqual(['unit-a', 'unit-b'])
  })

  it('keeps user management permissions out of read-only profiles', () => {
    expect(service.permissionsForRole(Role.CONSULTA)).not.toContain(Permission.USERS_WRITE)
    expect(service.permissionsForRole(Role.TENANT_ADMIN)).toContain(Permission.USERS_WRITE)
  })
})
