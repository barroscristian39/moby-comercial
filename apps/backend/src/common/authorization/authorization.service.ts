import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common'
import { AccessContext, Permission, RequestUser, Role, TenantStatus } from '@moby/shared'
import { AuthorizationRepository } from './authorization.repository'
import { menusForRole, permissionsForRole } from './permissions'

@Injectable()
export class AuthorizationService {
  constructor(private readonly authorizationRepository: AuthorizationRepository) {}

  permissionsForRole(role: string): Permission[] {
    return permissionsForRole(role)
  }

  menusForRole(role: string) {
    return menusForRole(role)
  }

  buildAccessContext(user: RequestUser): AccessContext {
    return {
      user_id: user.userId,
      tenant_id: user.tenantId,
      role: user.role,
      companies_allowed: user.companyIds ?? [],
      units_allowed: user.unitIds ?? [],
      available_permissions: user.permissions ?? [],
      menus: menusForRole(String(user.role)),
    }
  }

  isSuperAdmin(user: Pick<RequestUser, 'role'>): boolean {
    return user.role === Role.SUPER_ADMIN
  }

  isTenantAdmin(user: Pick<RequestUser, 'role'>): boolean {
    return user.role === Role.TENANT_ADMIN
  }

  assertTenantIsUsable(user: {
    role: string
    tenantId: string | null
    tenant?: { status: TenantStatus | string; isActive: boolean } | null
  }) {
    if (user.role === Role.SUPER_ADMIN) return

    if (!user.tenantId || !user.tenant) {
      throw new UnauthorizedException({
        error: { code: 'TENANT_REQUIRED', message: 'Usuário sem ambiente válido', statusCode: 401 },
      })
    }

    const statusAllowsLogin =
      user.tenant.status === TenantStatus.ACTIVE || user.tenant.status === TenantStatus.TRIAL

    if (!user.tenant.isActive || !statusAllowsLogin) {
      throw new UnauthorizedException({
        error: { code: 'TENANT_INACTIVE', message: 'Ambiente inativo ou suspenso', statusCode: 401 },
      })
    }
  }

  async assertTenantAccess(currentUser: RequestUser, tenantId: string): Promise<void> {
    if (this.isSuperAdmin(currentUser)) return
    if (!currentUser.tenantId || currentUser.tenantId !== tenantId) {
      this.deny('Acesso fora do ambiente autenticado')
    }

    const tenant = await this.authorizationRepository.findTenantById(tenantId)
    if (!tenant || !tenant.isActive || ![TenantStatus.ACTIVE, TenantStatus.TRIAL].includes(tenant.status as TenantStatus)) {
      throw new UnauthorizedException({
        error: { code: 'TENANT_INACTIVE', message: 'Ambiente inativo ou suspenso', statusCode: 401 },
      })
    }
  }

  async assertCompanyAccess(currentUser: RequestUser, companyId: string): Promise<void> {
    if (this.isSuperAdmin(currentUser)) return

    const company = await this.authorizationRepository.findCompanyScope(companyId)
    if (!company || company.tenantId !== currentUser.tenantId || !company.isActive) {
      this.deny('Empresa fora do ambiente autenticado')
    }

    if (this.isTenantAdmin(currentUser)) return
    if (!currentUser.companyIds?.includes(companyId)) {
      this.deny('Empresa fora do escopo permitido')
    }
  }

  async assertUnitAccess(currentUser: RequestUser, unitId: string): Promise<void> {
    if (this.isSuperAdmin(currentUser)) return

    const unit = await this.authorizationRepository.findUnitScope(unitId)
    if (!unit || unit.tenantId !== currentUser.tenantId || !unit.isActive) {
      this.deny('Unidade fora do ambiente autenticado')
    }

    if (this.isTenantAdmin(currentUser)) return
    if (!currentUser.unitIds?.includes(unitId)) {
      this.deny('Unidade fora do escopo permitido')
    }
  }

  async assertCompanyIdsInTenant(tenantId: string, companyIds: string[]): Promise<void> {
    const outsideCount = await this.authorizationRepository.countCompaniesOutsideTenant(tenantId, companyIds)
    if (outsideCount > 0) {
      this.deny('Uma ou mais empresas não pertencem ao ambiente informado')
    }
  }

  async assertUnitIdsInTenantAndCompanies(
    tenantId: string,
    companyIds: string[],
    unitIds: string[],
  ): Promise<void> {
    const outsideTenant = await this.authorizationRepository.countUnitsOutsideTenant(tenantId, unitIds)
    if (outsideTenant > 0) {
      this.deny('Uma ou mais unidades não pertencem ao ambiente informado')
    }

    const outsideCompanies = await this.authorizationRepository.countUnitsOutsideCompanies(companyIds, unitIds)
    if (outsideCompanies > 0) {
      this.deny('Uma ou mais unidades não pertencem às empresas permitidas')
    }
  }

  async expandScopeForAdmin(user: RequestUser): Promise<RequestUser> {
    if (user.role === Role.SUPER_ADMIN) {
      return {
        ...user,
        companyIds: await this.authorizationRepository.listAllCompanyIds(),
        unitIds: await this.authorizationRepository.listAllUnitIds(),
      }
    }

    if (user.role === Role.TENANT_ADMIN && user.tenantId) {
      return {
        ...user,
        companyIds: await this.authorizationRepository.listCompanyIdsForTenant(user.tenantId),
        unitIds: await this.authorizationRepository.listUnitIdsForTenant(user.tenantId),
      }
    }

    return user
  }

  private deny(message: string): never {
    throw new ForbiddenException({
      error: { code: 'FORBIDDEN_SCOPE', message, statusCode: 403 },
    })
  }
}
