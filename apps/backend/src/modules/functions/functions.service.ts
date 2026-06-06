import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { AuditAction } from '@prisma/client'
import { PaginationDto, RequestUser, Role } from '@moby/shared'
import { AuthorizationService } from '../../common/authorization/authorization.service'
import { AuditService } from '../audit/audit.service'
import { CreateFunctionDto } from './dto/create-function.dto'
import { UpdateFunctionDto } from './dto/update-function.dto'
import { FunctionEntity } from './entities/function.entity'
import { FunctionsRepository } from './functions.repository'

@Injectable()
export class FunctionsService {
  constructor(
    private readonly functionsRepository: FunctionsRepository,
    private readonly authorizationService: AuthorizationService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(
    currentUser: RequestUser,
    pagination: PaginationDto,
    filters: { tenantId?: string; unitId?: string; search?: string },
  ) {
    const tenantId = currentUser.role === Role.SUPER_ADMIN ? filters.tenantId : currentUser.tenantId ?? undefined
    const companyIds = this.authorizationService.resolveCompanyScope(currentUser)
    const unitIds = this.authorizationService.resolveUnitScope(currentUser, filters.unitId)

    const { items, total } = await this.functionsRepository.findAll({
      tenantId,
      companyIds,
      unitIds,
      page: pagination.page,
      perPage: pagination.perPage,
      search: filters.search,
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

  async findOne(id: string, currentUser: RequestUser): Promise<{ data: FunctionEntity }> {
    const jobFunction = await this.getFunctionOrThrow(id)
    this.assertFunctionAccess(currentUser, jobFunction)
    return { data: this.mapToEntity(jobFunction) }
  }

  async create(dto: CreateFunctionDto, currentUser: RequestUser): Promise<{ data: FunctionEntity }> {
    this.assertAdmin(currentUser)
    const { tenantId, companyId } = await this.resolveScopeFromUnits(dto.unitIds, currentUser, dto.companyId)

    const created = await this.functionsRepository.create({
      ...dto,
      tenantId,
      companyId,
    })

    await this.auditService.record({
      tenantId,
      actorUserId: currentUser.userId,
      action: AuditAction.CREATE,
      entityType: 'functions',
      entityId: created.id,
      metadata: { function: this.mapToEntity(created) },
    })

    return { data: this.mapToEntity(created) }
  }

  async update(id: string, dto: UpdateFunctionDto, currentUser: RequestUser): Promise<{ data: FunctionEntity }> {
    this.assertAdmin(currentUser)
    const jobFunction = await this.getFunctionOrThrow(id)
    this.assertFunctionAccess(currentUser, jobFunction)

    let normalizedCompanyId = dto.companyId
    if (dto.unitIds) {
      const scope = await this.resolveScopeFromUnits(dto.unitIds, currentUser, dto.companyId)
      normalizedCompanyId = scope.companyId
      if (scope.tenantId !== jobFunction.tenantId) {
        this.deny('As unidades informadas pertencem a outro ambiente')
      }
    }

    const updated = await this.functionsRepository.update(id, {
      ...dto,
      tenantId: jobFunction.tenantId,
      normalizedCompanyId,
    })

    await this.auditService.record({
      tenantId: updated.tenantId,
      actorUserId: currentUser.userId,
      action: AuditAction.UPDATE,
      entityType: 'functions',
      entityId: updated.id,
      metadata: { previous: this.mapToEntity(jobFunction), next: this.mapToEntity(updated) },
    })

    return { data: this.mapToEntity(updated) }
  }

  async remove(id: string, currentUser: RequestUser): Promise<void> {
    this.assertAdmin(currentUser)
    const jobFunction = await this.getFunctionOrThrow(id)
    this.assertFunctionAccess(currentUser, jobFunction)

    await this.functionsRepository.softDelete(id, currentUser.userId)
    await this.auditService.record({
      tenantId: jobFunction.tenantId,
      actorUserId: currentUser.userId,
      action: AuditAction.DELETE,
      entityType: 'functions',
      entityId: id,
      metadata: { function: this.mapToEntity(jobFunction) },
    })
  }

  private async resolveScopeFromUnits(unitIds: string[], currentUser: RequestUser, requestedCompanyId?: string) {
    const uniqueUnitIds = Array.from(new Set(unitIds))
    const units = await this.functionsRepository.findUnitsByIds(uniqueUnitIds)
    if (units.length !== uniqueUnitIds.length) {
      throw new NotFoundException({
        error: { code: 'UNIT_NOT_FOUND', message: 'Uma ou mais unidades não foram encontradas', statusCode: 404 },
      })
    }

    const tenantIds = new Set(units.map((unit) => unit.tenantId))
    if (tenantIds.size !== 1) {
      this.deny('As unidades de uma função precisam pertencer ao mesmo ambiente')
    }

    if (units.some((unit) => !unit.isActive)) {
      this.deny('Não é possível vincular função a unidade inativa')
    }

    const tenantId = units[0].tenantId
    if (currentUser.role !== Role.SUPER_ADMIN && currentUser.tenantId !== tenantId) {
      this.deny('Unidade fora do ambiente autenticado')
    }

    if (requestedCompanyId && !units.some((unit) => unit.companyId === requestedCompanyId)) {
      this.deny('A empresa informada precisa pertencer a uma das unidades vinculadas')
    }

    return {
      tenantId,
      companyId: requestedCompanyId ?? units[0].companyId,
    }
  }

  private async getFunctionOrThrow(id: string) {
    const jobFunction = await this.functionsRepository.findById(id)
    if (!jobFunction) {
      throw new NotFoundException({
        error: { code: 'FUNCTION_NOT_FOUND', message: 'Função não encontrada', statusCode: 404 },
      })
    }
    return jobFunction
  }

  private assertAdmin(currentUser: RequestUser) {
    if (currentUser.role === Role.SUPER_ADMIN || currentUser.role === Role.TENANT_ADMIN) return
    this.deny('Apenas administradores podem gerenciar funções')
  }

  private assertFunctionAccess(currentUser: RequestUser, jobFunction: any) {
    if (currentUser.role === Role.SUPER_ADMIN) return
    if (!currentUser.tenantId || currentUser.tenantId !== jobFunction.tenantId) {
      this.deny('Função fora do ambiente autenticado')
    }
    if (currentUser.role === Role.TENANT_ADMIN) return

    this.authorizationService.assertCompanyInScope(currentUser, jobFunction.companyId, 'Função fora do escopo de empresa permitido')

    const functionUnits: any[] = jobFunction.functionUnits ?? []
    const allowedUnits = new Set(this.authorizationService.resolveUnitScope(currentUser) ?? [])
    const hasUnitAccess =
      functionUnits.some((link: any) => allowedUnits.has(link.unitId))
      || (jobFunction.unitId ? allowedUnits.has(jobFunction.unitId) : false)
    if (!hasUnitAccess) {
      this.deny('Função fora do escopo de unidades permitido')
    }
  }

  private mapToEntity(jobFunction: any): FunctionEntity {
    return {
      id: jobFunction.id,
      tenantId: jobFunction.tenantId,
      companyId: jobFunction.companyId,
      unitIds: jobFunction.functionUnits?.map((link: any) => link.unitId) ?? [],
      name: jobFunction.name,
      cbo: jobFunction.cbo,
      description: jobFunction.description,
      status: jobFunction.status,
      isActive: jobFunction.isActive,
      createdAt: jobFunction.createdAt,
      updatedAt: jobFunction.updatedAt,
    }
  }

  private deny(message: string): never {
    throw new ForbiddenException({
      error: { code: 'FORBIDDEN', message, statusCode: 403 },
    })
  }
}
