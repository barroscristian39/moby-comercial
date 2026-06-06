import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { AuditAction, Role as PrismaRole, TenantStatus as PrismaTenantStatus } from '@prisma/client'
import { PaginationDto, RequestUser, Role, TenantStatus } from '@moby/shared'
import { AuthorizationService } from '../../common/authorization/authorization.service'
import { PasswordService } from '../../common/security/password.service'
import { AuditService } from '../audit/audit.service'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { UserEntity } from './entities/user.entity'
import { isOperationalRole } from './user-scope-policy'
import { UsersRepository } from './users.repository'

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly passwordService: PasswordService,
    private readonly authorizationService: AuthorizationService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(currentUser: RequestUser, pagination: PaginationDto, search?: string, tenantId?: string) {
    const resolvedTenantId = currentUser.role === Role.SUPER_ADMIN ? tenantId : currentUser.tenantId
    const { items, total } = await this.usersRepository.findAll({
      tenantId: resolvedTenantId ?? undefined,
      page: pagination.page,
      perPage: pagination.perPage,
      search,
    })

    return {
      data: items.map(this.mapToEntity),
      meta: {
        total,
        page: pagination.page,
        perPage: pagination.perPage,
        totalPages: Math.ceil(total / pagination.perPage),
      },
    }
  }

  async findOne(id: string, currentUser: RequestUser): Promise<{ data: UserEntity }> {
    const user = await this.getUserOrThrow(id)
    this.assertCanManageTarget(currentUser, user)
    return { data: this.mapToEntity(user) }
  }

  async create(dto: CreateUserDto, currentUser: RequestUser): Promise<{ data: UserEntity }> {
    const tenantId = await this.resolveTenantForCreate(dto, currentUser)
    await this.validateTenantActive(tenantId)
    this.assertRoleCanBeManaged(currentUser, dto.role)
    this.assertOperationalScope(dto.role, dto.companyIds)

    const existing = await this.usersRepository.findByEmail(dto.email)
    if (existing) {
      throw new ConflictException({
        error: { code: 'EMAIL_CONFLICT', message: 'E-mail já cadastrado', statusCode: 409 },
      })
    }

    if (tenantId) {
      await this.authorizationService.assertCompanyIdsInTenant(tenantId, dto.companyIds)
      await this.authorizationService.assertUnitIdsInTenantAndCompanies(tenantId, dto.companyIds, dto.unitIds)
    } else if (dto.companyIds.length || dto.unitIds.length) {
      this.deny('Usuário da plataforma não pode receber escopo de empresa ou unidade')
    }

    const created = await this.usersRepository.create({
      tenantId,
      email: dto.email,
      passwordHash: await this.passwordService.hash(dto.password),
      name: dto.name,
      role: dto.role as PrismaRole,
      isActive: dto.isActive,
      createdBy: currentUser.userId,
      companyIds: dto.companyIds,
      unitIds: dto.unitIds,
    })

    await this.auditService.record({
      tenantId,
      actorUserId: currentUser.userId,
      action: AuditAction.CREATE,
      entityType: 'users',
      entityId: created.id,
      metadata: { user: this.mapToEntity(created) },
    })

    return { data: this.mapToEntity(created) }
  }

  async update(id: string, dto: UpdateUserDto, currentUser: RequestUser): Promise<{ data: UserEntity }> {
    const user = await this.getUserOrThrow(id)
    this.assertCanManageTarget(currentUser, user)

    const nextRole = dto.role ?? user.role
    this.assertRoleCanBeManaged(currentUser, nextRole)
    this.assertOperationalScope(nextRole, dto.companyIds ?? this.companyIdsOf(user))

    const tenantId = user.tenantId
    if (!tenantId) {
      if (currentUser.role !== Role.SUPER_ADMIN) this.deny('Usuário da plataforma só pode ser gerenciado pelo administrador da plataforma')
    } else {
      await this.authorizationService.assertCompanyIdsInTenant(tenantId, dto.companyIds ?? this.companyIdsOf(user))
      await this.authorizationService.assertUnitIdsInTenantAndCompanies(
        tenantId,
        dto.companyIds ?? this.companyIdsOf(user),
        dto.unitIds ?? this.unitIdsOf(user),
      )
    }

    const updated = await this.usersRepository.update(id, {
      name: dto.name,
      role: dto.role as PrismaRole | undefined,
      isActive: dto.isActive,
      companyIds: dto.companyIds,
      unitIds: dto.unitIds,
    })

    if (dto.isActive === false) {
      await this.usersRepository.revokeRefreshTokens(id)
    }

    const action =
      dto.isActive === false
        ? AuditAction.USER_DEACTIVATED
        : dto.isActive === true
          ? AuditAction.USER_ACTIVATED
          : dto.companyIds || dto.unitIds || dto.role
            ? AuditAction.USER_PERMISSION_CHANGED
            : AuditAction.UPDATE

    await this.auditService.record({
      tenantId: updated.tenantId,
      actorUserId: currentUser.userId,
      action,
      entityType: 'users',
      entityId: updated.id,
      metadata: { previous: this.mapToEntity(user), next: this.mapToEntity(updated) },
    })

    return { data: this.mapToEntity(updated) }
  }

  async remove(id: string, currentUser: RequestUser): Promise<void> {
    const user = await this.getUserOrThrow(id)
    this.assertCanManageTarget(currentUser, user)

    if (id === currentUser.userId) {
      this.deny('Não é permitido remover o próprio usuário autenticado')
    }

    await this.usersRepository.softDelete(id, currentUser.userId)
    await this.usersRepository.revokeRefreshTokens(id)

    await this.auditService.record({
      tenantId: user.tenantId,
      actorUserId: currentUser.userId,
      action: AuditAction.DELETE,
      entityType: 'users',
      entityId: id,
      metadata: { user: this.mapToEntity(user) },
    })
  }

  private async resolveTenantForCreate(dto: CreateUserDto, currentUser: RequestUser): Promise<string | null> {
    if (currentUser.role === Role.SUPER_ADMIN) {
      if (dto.role === Role.SUPER_ADMIN) {
        return null
      }
      if (!dto.tenantId) {
        this.deny('É obrigatório informar o ambiente para criar esse usuário')
      }
      return dto.tenantId
    }

    if (!currentUser.tenantId) {
      this.deny('Usuário sem ambiente associado')
    }

    if (dto.tenantId && dto.tenantId !== currentUser.tenantId) {
      this.deny('Administrador do ambiente só pode criar usuários no próprio ambiente')
    }

    return currentUser.tenantId
  }

  private async validateTenantActive(tenantId: string | null) {
    if (!tenantId) return
    const tenant = await this.usersRepository.findTenantById(tenantId)
    const activeStatuses: string[] = [PrismaTenantStatus.ACTIVE, PrismaTenantStatus.TRIAL]
    if (!tenant || !tenant.isActive || !activeStatuses.includes(tenant.status)) {
      throw new ForbiddenException({
        error: { code: 'TENANT_INACTIVE', message: 'Ambiente inativo ou suspenso', statusCode: 403 },
      })
    }
  }

  private assertRoleCanBeManaged(currentUser: RequestUser, targetRole: string) {
    if (currentUser.role === Role.SUPER_ADMIN) return

    if (targetRole === Role.SUPER_ADMIN || targetRole === Role.TENANT_ADMIN) {
      this.deny('Administrador do ambiente não pode criar ou promover administradores da plataforma')
    }
  }

  private assertOperationalScope(role: string, companyIds: string[]) {
    if (role === Role.SUPER_ADMIN || role === Role.TENANT_ADMIN) return
    if (!isOperationalRole(role)) {
      this.deny('Perfil de usuário inválido')
    }
    if (!companyIds.length) {
      this.deny('Usuários operacionais precisam de ao menos uma empresa explícita')
    }
  }

  private assertCanManageTarget(currentUser: RequestUser, target: any) {
    if (currentUser.role === Role.SUPER_ADMIN) return

    if (!currentUser.tenantId || target.tenantId !== currentUser.tenantId) {
      this.deny('Administrador do ambiente só pode gerenciar usuários do próprio ambiente')
    }

    if (target.role === Role.SUPER_ADMIN) {
      this.deny('Administrador do ambiente não pode gerenciar administradores da plataforma')
    }
  }

  private async getUserOrThrow(id: string) {
    const user = await this.usersRepository.findById(id)
    if (!user || user.deletedAt) {
      throw new NotFoundException({
        error: { code: 'USER_NOT_FOUND', message: 'Usuário não encontrado', statusCode: 404 },
      })
    }
    return user
  }

  private companyIdsOf(user: any): string[] {
    return user.companyAccess?.map((access: any) => access.companyId) ?? []
  }

  private unitIdsOf(user: any): string[] {
    return user.unitAccess?.map((access: any) => access.unitId) ?? []
  }

  private mapToEntity(user: any): UserEntity {
    const companyIds = user.companyAccess?.map((access: any) => access.companyId) ?? []
    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.companyId ?? companyIds[0] ?? null,
      companyIds,
      unitIds: user.unitAccess?.map((access: any) => access.unitId) ?? [],
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  }

  private deny(message: string): never {
    throw new ForbiddenException({
      error: { code: 'FORBIDDEN', message, statusCode: 403 },
    })
  }
}
