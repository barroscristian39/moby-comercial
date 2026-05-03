import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { AuditAction, TenantStatus as PrismaTenantStatus } from '@prisma/client'
import { PaginationDto, RequestUser, TenantStatus } from '@moby/shared'
import { PasswordService } from '../../common/security/password.service'
import { AuditService } from '../audit/audit.service'
import { CreateTenantDto } from './dto/create-tenant.dto'
import { UpdateTenantDto, UpdateTenantStatusDto } from './dto/update-tenant.dto'
import { TenantEntity } from './entities/tenant.entity'
import { TenantsRepository } from './tenants.repository'

@Injectable()
export class TenantsService {
  constructor(
    private readonly tenantsRepository: TenantsRepository,
    private readonly passwordService: PasswordService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(pagination: PaginationDto, search?: string, status?: TenantStatus) {
    const { items, total } = await this.tenantsRepository.findAll(
      pagination.page,
      pagination.perPage,
      search,
      status as PrismaTenantStatus | undefined,
    )

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

  async findOne(id: string) {
    const tenant = await this.tenantsRepository.findById(id)
    if (!tenant) {
      throw new NotFoundException({
        error: { code: 'TENANT_NOT_FOUND', message: 'Ambiente não encontrado', statusCode: 404 },
      })
    }
    return { data: this.mapToEntity(tenant) }
  }

  async create(dto: CreateTenantDto, currentUser: RequestUser) {
    const slug = dto.slug ?? this.slugify(dto.name)

    const [existingSlug, existingAdmin] = await Promise.all([
      this.tenantsRepository.findBySlug(slug),
      this.tenantsRepository.findUserByEmail(dto.admin.email),
    ])

    if (existingSlug) {
      throw new ConflictException({
        error: { code: 'TENANT_SLUG_CONFLICT', message: 'Identificador do ambiente já cadastrado', statusCode: 409 },
      })
    }

    if (existingAdmin) {
      throw new ConflictException({
        error: { code: 'EMAIL_CONFLICT', message: 'E-mail do administrador já cadastrado', statusCode: 409 },
      })
    }

    const { tenant, admin } = await this.tenantsRepository.createWithAdmin({
      ...dto,
      slug,
      passwordHash: await this.passwordService.hash(dto.admin.password),
      createdBy: currentUser.userId,
    })

    await this.auditService.record({
      tenantId: tenant.id,
      actorUserId: currentUser.userId,
      action: AuditAction.CREATE,
      entityType: 'tenants',
      entityId: tenant.id,
      metadata: { tenant: this.mapToEntity(tenant), adminUserId: admin.id, adminEmail: admin.email },
    })

    return { data: this.mapToEntity(tenant) }
  }

  async update(id: string, dto: UpdateTenantDto, currentUser: RequestUser) {
    const current = await this.tenantsRepository.findById(id)
    if (!current) {
      throw new NotFoundException({
        error: { code: 'TENANT_NOT_FOUND', message: 'Ambiente não encontrado', statusCode: 404 },
      })
    }

    if (dto.slug && dto.slug !== current.slug) {
      const existingSlug = await this.tenantsRepository.findBySlug(dto.slug)
      if (existingSlug) {
        throw new ConflictException({
          error: { code: 'TENANT_SLUG_CONFLICT', message: 'Identificador do ambiente já cadastrado', statusCode: 409 },
        })
      }
    }

    const updated = await this.tenantsRepository.update(id, dto)
    await this.auditService.record({
      tenantId: updated.id,
      actorUserId: currentUser.userId,
      action: AuditAction.UPDATE,
      entityType: 'tenants',
      entityId: updated.id,
      metadata: { previous: this.mapToEntity(current), next: this.mapToEntity(updated) },
    })

    return { data: this.mapToEntity(updated) }
  }

  async updateStatus(id: string, dto: UpdateTenantStatusDto, currentUser: RequestUser) {
    const current = await this.tenantsRepository.findById(id)
    if (!current) {
      throw new NotFoundException({
        error: { code: 'TENANT_NOT_FOUND', message: 'Ambiente não encontrado', statusCode: 404 },
      })
    }

    const isActive = dto.isActive ?? [TenantStatus.ACTIVE, TenantStatus.TRIAL].includes(dto.status)
    const updated = await this.tenantsRepository.updateStatus(id, dto.status as PrismaTenantStatus, isActive)

    if (!isActive || dto.status === TenantStatus.SUSPENDED || dto.status === TenantStatus.CANCELED) {
      await this.tenantsRepository.deactivateTenantUsers(id)
    }

    await this.auditService.record({
      tenantId: id,
      actorUserId: currentUser.userId,
      action: AuditAction.TENANT_STATUS_CHANGED,
      entityType: 'tenants',
      entityId: id,
      metadata: { previousStatus: current.status, nextStatus: updated.status, isActive: updated.isActive },
    })

    return { data: this.mapToEntity(updated) }
  }

  async remove(id: string, currentUser: RequestUser) {
    await this.updateStatus(id, { status: TenantStatus.CANCELED, isActive: false }, currentUser)
  }

  private slugify(value: string): string {
    const slug = value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    return slug || `ambiente-${Date.now()}`
  }

  private mapToEntity(tenant: any): TenantEntity {
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      plan: tenant.plan,
      startDate: tenant.startDate,
      endDate: tenant.endDate,
      isActive: tenant.isActive,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    }
  }
}
