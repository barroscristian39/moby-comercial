import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { AuditAction } from '@prisma/client'
import { PaginationDto, RequestUser, Role } from '@moby/shared'
import { AuthorizationService } from '../../common/authorization/authorization.service'
import { AuditService } from '../audit/audit.service'
import { CreateUnitDto } from './dto/create-unit.dto'
import { UpdateUnitDto } from './dto/update-unit.dto'
import { UnitEntity } from './entities/unit.entity'
import { UnitsRepository } from './units.repository'

@Injectable()
export class UnitsService {
  constructor(
    private readonly unitsRepository: UnitsRepository,
    private readonly authorizationService: AuthorizationService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(currentUser: RequestUser, pagination: PaginationDto, search?: string, requestedCompanyId?: string) {
    if (requestedCompanyId) {
      await this.authorizationService.assertCompanyAccess(currentUser, requestedCompanyId)
    }
    const scopedUnitIds = currentUser.unitIds ?? []

    const { items, total } = await this.unitsRepository.findAll({
      tenantId: currentUser.role === Role.SUPER_ADMIN ? undefined : currentUser.tenantId ?? undefined,
      companyId: requestedCompanyId,
      unitIds:
        currentUser.role === Role.SUPER_ADMIN || currentUser.role === Role.TENANT_ADMIN || scopedUnitIds.length === 0
          ? undefined
          : scopedUnitIds,
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

  async findOne(id: string, currentUser: RequestUser): Promise<{ data: UnitEntity }> {
    await this.authorizationService.assertUnitAccess(currentUser, id)
    const unit = await this.getUnitOrThrow(id)
    return { data: this.mapToEntity(unit) }
  }

  async create(dto: CreateUnitDto, currentUser: RequestUser): Promise<{ data: UnitEntity }> {
    if (currentUser.role !== Role.SUPER_ADMIN && currentUser.role !== Role.TENANT_ADMIN) {
      this.deny('Apenas administradores podem criar unidades')
    }

    await this.authorizationService.assertCompanyAccess(currentUser, dto.companyId)
    const company = await this.unitsRepository.findCompanyById(dto.companyId)
    if (!company) {
      throw new NotFoundException({
        error: { code: 'COMPANY_NOT_FOUND', message: 'Empresa não encontrada', statusCode: 404 },
      })
    }

    const unit = await this.unitsRepository.create(company.tenantId, dto)
    await this.auditService.record({
      tenantId: unit.tenantId,
      actorUserId: currentUser.userId,
      action: AuditAction.CREATE,
      entityType: 'units',
      entityId: unit.id,
      metadata: { unit: this.mapToEntity(unit) },
    })

    return { data: this.mapToEntity(unit) }
  }

  async update(id: string, dto: UpdateUnitDto, currentUser: RequestUser): Promise<{ data: UnitEntity }> {
    await this.authorizationService.assertUnitAccess(currentUser, id)
    const unit = await this.getUnitOrThrow(id)

    const updated = await this.unitsRepository.update(id, dto)
    await this.auditService.record({
      tenantId: updated.tenantId,
      actorUserId: currentUser.userId,
      action: AuditAction.UPDATE,
      entityType: 'units',
      entityId: id,
      metadata: { previous: this.mapToEntity(unit), next: this.mapToEntity(updated) },
    })

    return { data: this.mapToEntity(updated) }
  }

  async remove(id: string, currentUser: RequestUser): Promise<void> {
    await this.authorizationService.assertUnitAccess(currentUser, id)
    const unit = await this.getUnitOrThrow(id)

    await this.unitsRepository.softDelete(id, currentUser.userId)
    await this.auditService.record({
      tenantId: unit.tenantId,
      actorUserId: currentUser.userId,
      action: AuditAction.DELETE,
      entityType: 'units',
      entityId: id,
      metadata: { unit: this.mapToEntity(unit) },
    })
  }

  private async getUnitOrThrow(id: string) {
    const unit = await this.unitsRepository.findById(id)
    if (!unit) {
      throw new NotFoundException({
        error: { code: 'UNIT_NOT_FOUND', message: 'Unidade não encontrada', statusCode: 404 },
      })
    }
    return unit
  }

  private mapToEntity(unit: any): UnitEntity {
    return {
      id: unit.id,
      tenantId: unit.tenantId,
      companyId: unit.companyId,
      name: unit.name,
      cnpj: unit.cnpj,
      addressStreet: unit.addressStreet,
      addressNumber: unit.addressNumber,
      addressComplement: unit.addressComplement,
      addressNeighborhood: unit.addressNeighborhood,
      addressCity: unit.addressCity,
      addressState: unit.addressState,
      addressZipCode: unit.addressZipCode,
      phone: unit.phone,
      email: unit.email,
      isActive: unit.isActive,
      createdAt: unit.createdAt,
      updatedAt: unit.updatedAt,
    }
  }

  private deny(message: string): never {
    throw new ForbiddenException({
      error: { code: 'FORBIDDEN', message, statusCode: 403 },
    })
  }
}
