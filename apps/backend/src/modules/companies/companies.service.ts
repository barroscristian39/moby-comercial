import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { AuditAction, TenantStatus } from '@prisma/client'
import { PaginationDto, RequestUser, Role } from '@moby/shared'
import { AuthorizationService } from '../../common/authorization/authorization.service'
import { AuditService } from '../audit/audit.service'
import { CompaniesRepository } from './companies.repository'
import { CreateCompanyDto } from './dto/create-company.dto'
import { UpdateCompanyDto } from './dto/update-company.dto'
import { CompanyEntity } from './entities/company.entity'

@Injectable()
export class CompaniesService {
  constructor(
    private readonly companiesRepository: CompaniesRepository,
    private readonly authorizationService: AuthorizationService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(currentUser: RequestUser, pagination: PaginationDto, search?: string, requestedTenantId?: string) {
    const tenantId = currentUser.role === Role.SUPER_ADMIN ? requestedTenantId : currentUser.tenantId ?? undefined
    const companyIds =
      currentUser.role === Role.SUPER_ADMIN || currentUser.role === Role.TENANT_ADMIN
        ? undefined
        : currentUser.companyIds

    const { items, total } = await this.companiesRepository.findAll({
      tenantId,
      companyIds,
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

  async findOne(id: string, currentUser: RequestUser): Promise<{ data: CompanyEntity }> {
    await this.authorizationService.assertCompanyAccess(currentUser, id)
    const company = await this.getCompanyOrThrow(id)
    return { data: this.mapToEntity(company) }
  }

  async create(dto: CreateCompanyDto, currentUser: RequestUser): Promise<{ data: CompanyEntity }> {
    const tenantId = await this.resolveTenantId(dto.tenantId, currentUser)
    const existing = await this.companiesRepository.findByCnpj(tenantId, dto.cnpj)
    if (existing) {
      throw new ConflictException({
        error: { code: 'CNPJ_CONFLICT', message: 'CNPJ já cadastrado neste ambiente', statusCode: 409 },
      })
    }

    const company = await this.companiesRepository.create(tenantId, dto)
    await this.auditService.record({
      tenantId,
      actorUserId: currentUser.userId,
      action: AuditAction.CREATE,
      entityType: 'companies',
      entityId: company.id,
      metadata: { company: this.mapToEntity(company) },
    })

    return { data: this.mapToEntity(company) }
  }

  async update(id: string, dto: UpdateCompanyDto, currentUser: RequestUser): Promise<{ data: CompanyEntity }> {
    await this.authorizationService.assertCompanyAccess(currentUser, id)
    const company = await this.getCompanyOrThrow(id)

    const updated = await this.companiesRepository.update(id, dto)
    await this.auditService.record({
      tenantId: updated.tenantId,
      actorUserId: currentUser.userId,
      action: AuditAction.UPDATE,
      entityType: 'companies',
      entityId: id,
      metadata: { previous: this.mapToEntity(company), next: this.mapToEntity(updated) },
    })

    return { data: this.mapToEntity(updated) }
  }

  async remove(id: string, currentUser: RequestUser): Promise<void> {
    await this.authorizationService.assertCompanyAccess(currentUser, id)
    const company = await this.getCompanyOrThrow(id)

    await this.companiesRepository.softDelete(id, currentUser.userId)
    await this.auditService.record({
      tenantId: company.tenantId,
      actorUserId: currentUser.userId,
      action: AuditAction.DELETE,
      entityType: 'companies',
      entityId: id,
      metadata: { company: this.mapToEntity(company) },
    })
  }

  private async resolveTenantId(requestedTenantId: string | undefined, currentUser: RequestUser): Promise<string> {
    if (currentUser.role === Role.SUPER_ADMIN) {
      if (!requestedTenantId) this.deny('É obrigatório informar o ambiente para cadastrar a empresa')
      await this.assertTenantCanReceiveData(requestedTenantId)
      return requestedTenantId
    }

    if (currentUser.role !== Role.TENANT_ADMIN) {
      this.deny('Apenas o administrador do ambiente pode criar empresas neste ambiente')
    }
    if (!currentUser.tenantId) this.deny('Usuário sem ambiente associado')

    await this.assertTenantCanReceiveData(currentUser.tenantId)
    return currentUser.tenantId
  }

  private async assertTenantCanReceiveData(tenantId: string) {
    const tenant = await this.companiesRepository.findTenantById(tenantId)
    const activeStatuses: string[] = [TenantStatus.ACTIVE, TenantStatus.TRIAL]
    if (!tenant || !tenant.isActive || !activeStatuses.includes(tenant.status)) {
      throw new ForbiddenException({
        error: { code: 'TENANT_INACTIVE', message: 'Ambiente inativo ou suspenso', statusCode: 403 },
      })
    }
  }

  private async getCompanyOrThrow(id: string) {
    const company = await this.companiesRepository.findById(id)
    if (!company) {
      throw new NotFoundException({
        error: { code: 'COMPANY_NOT_FOUND', message: 'Empresa não encontrada', statusCode: 404 },
      })
    }
    return company
  }

  private mapToEntity(company: any): CompanyEntity {
    return {
      id: company.id,
      tenantId: company.tenantId,
      name: company.name,
      tradeName: company.tradeName,
      cnpj: company.cnpj,
      cnae: company.cnae,
      addressStreet: company.addressStreet,
      addressNumber: company.addressNumber,
      addressComplement: company.addressComplement,
      addressNeighborhood: company.addressNeighborhood,
      addressCity: company.addressCity,
      addressState: company.addressState,
      addressZipCode: company.addressZipCode,
      phone: company.phone,
      email: company.email,
      responsibleName: company.responsibleName,
      logoUrl: company.logoUrl,
      isActive: company.isActive,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
    }
  }

  private deny(message: string): never {
    throw new ForbiddenException({
      error: { code: 'FORBIDDEN', message, statusCode: 403 },
    })
  }
}
