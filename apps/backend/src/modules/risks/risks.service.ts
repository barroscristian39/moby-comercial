import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { AuditAction } from '@prisma/client'
import { PaginationDto, RequestUser, RiskLevel, Role } from '@moby/shared'
import { AuditService } from '../audit/audit.service'
import { CreateRiskDto } from './dto/create-risk.dto'
import { UpdateRiskDto } from './dto/update-risk.dto'
import { RiskEntity } from './entities/risk.entity'
import { RisksRepository } from './risks.repository'

@Injectable()
export class RisksService {
  constructor(
    private readonly risksRepository: RisksRepository,
    private readonly auditService: AuditService,
  ) {}

  async findAll(
    currentUser: RequestUser,
    pagination: PaginationDto,
    filters: {
      tenantId?: string
      companyId?: string
      unitId?: string
      search?: string
      isActive?: boolean
      type?: string
      level?: RiskLevel
    },
  ) {
    const tenantId = currentUser.role === Role.SUPER_ADMIN ? filters.tenantId : currentUser.tenantId ?? undefined
    const companyIds = this.resolveCompanyScope(currentUser, filters.companyId)
    const unitIds = this.resolveUnitScope(currentUser, filters.unitId)

    const { items, total } = await this.risksRepository.findAll({
      tenantId,
      companyIds,
      unitIds,
      page: pagination.page,
      perPage: pagination.perPage,
      search: filters.search,
      isActive: filters.isActive,
      type: filters.type,
      level: filters.level,
    })

    return {
      data: items.map((risk) => this.mapToEntity(risk)),
      meta: {
        total,
        page: pagination.page,
        perPage: pagination.perPage,
        totalPages: Math.ceil(total / pagination.perPage),
      },
    }
  }

  async findOne(id: string, currentUser: RequestUser): Promise<{ data: RiskEntity }> {
    const risk = await this.getRiskOrThrow(id)
    this.assertRiskAccess(currentUser, risk)
    return { data: this.mapToEntity(risk) }
  }

  async create(dto: CreateRiskDto, currentUser: RequestUser): Promise<{ data: RiskEntity }> {
    const scope = await this.resolveScope(dto.unitId, dto.jobFunctionId, currentUser)
    const created = await this.risksRepository.create({
      tenantId: scope.tenantId,
      companyId: scope.companyId,
      unitId: scope.unitId,
      jobFunctionId: scope.jobFunctionId,
      name: dto.name,
      type: dto.type,
      level: dto.level,
      probability: dto.probability,
      severity: dto.severity,
      description: dto.description,
      controlMeasures: dto.controlMeasures,
    })

    await this.auditService.record({
      tenantId: created.tenantId,
      actorUserId: currentUser.userId,
      action: AuditAction.CREATE,
      entityType: 'risks',
      entityId: created.id,
      metadata: { risk: this.mapToEntity(created) },
    })

    return { data: this.mapToEntity(created) }
  }

  async update(id: string, dto: UpdateRiskDto, currentUser: RequestUser): Promise<{ data: RiskEntity }> {
    const risk = await this.getRiskOrThrow(id)
    this.assertRiskAccess(currentUser, risk)

    let scope: { companyId?: string; unitId?: string; jobFunctionId?: string | null } = {}
    if (dto.unitId !== undefined || dto.jobFunctionId !== undefined) {
      scope = await this.resolveScope(
        dto.unitId ?? risk.unitId,
        dto.jobFunctionId === undefined ? risk.jobFunctionId : dto.jobFunctionId,
        currentUser,
      )
    }

    const updated = await this.risksRepository.update(id, {
      companyId: scope.companyId,
      unitId: scope.unitId,
      jobFunctionId: scope.jobFunctionId,
      name: dto.name,
      type: dto.type,
      level: dto.level,
      probability: dto.probability,
      severity: dto.severity,
      description: dto.description,
      controlMeasures: dto.controlMeasures,
      isActive: dto.isActive,
    })

    await this.auditService.record({
      tenantId: updated.tenantId,
      actorUserId: currentUser.userId,
      action: AuditAction.UPDATE,
      entityType: 'risks',
      entityId: updated.id,
      metadata: {
        previous: this.mapToEntity(risk),
        next: this.mapToEntity(updated),
      },
    })

    return { data: this.mapToEntity(updated) }
  }

  async remove(id: string, currentUser: RequestUser): Promise<void> {
    const risk = await this.getRiskOrThrow(id)
    this.assertRiskAccess(currentUser, risk)

    const deleted = await this.risksRepository.softDelete(id, currentUser.userId)
    await this.auditService.record({
      tenantId: deleted.tenantId,
      actorUserId: currentUser.userId,
      action: AuditAction.DELETE,
      entityType: 'risks',
      entityId: deleted.id,
      metadata: { risk: this.mapToEntity(risk) },
    })
  }

  private resolveCompanyScope(currentUser: RequestUser, requestedCompanyId?: string) {
    if (currentUser.role === Role.SUPER_ADMIN || currentUser.role === Role.TENANT_ADMIN) {
      return requestedCompanyId ? [requestedCompanyId] : undefined
    }

    if (requestedCompanyId) {
      if (!currentUser.companyIds?.includes(requestedCompanyId)) {
        this.deny('Empresa fora do escopo permitido')
      }
      return [requestedCompanyId]
    }

    return currentUser.companyIds
  }

  private resolveUnitScope(currentUser: RequestUser, requestedUnitId?: string) {
    if (currentUser.role === Role.SUPER_ADMIN || currentUser.role === Role.TENANT_ADMIN) {
      return requestedUnitId ? [requestedUnitId] : undefined
    }

    if (requestedUnitId) {
      if (!currentUser.unitIds?.includes(requestedUnitId)) {
        this.deny('Unidade fora do escopo permitido')
      }
      return [requestedUnitId]
    }

    return currentUser.unitIds
  }

  private async resolveScope(unitId: string, jobFunctionId: string | null | undefined, currentUser: RequestUser) {
    const unit = await this.risksRepository.findUnitById(unitId)
    if (!unit) {
      throw new NotFoundException({
        error: { code: 'UNIT_NOT_FOUND', message: 'Unidade não encontrada', statusCode: 404 },
      })
    }

    if (!unit.isActive) {
      this.deny('Não é possível vincular risco a uma unidade inativa')
    }

    if (currentUser.role !== Role.SUPER_ADMIN) {
      if (!currentUser.tenantId || currentUser.tenantId !== unit.tenantId) {
        this.deny('Unidade fora do ambiente autenticado')
      }

      if (currentUser.role !== Role.TENANT_ADMIN) {
        if (currentUser.companyIds?.length && !currentUser.companyIds.includes(unit.companyId)) {
          this.deny('Empresa fora do escopo permitido')
        }
        if (currentUser.unitIds?.length && !currentUser.unitIds.includes(unit.id)) {
          this.deny('Unidade fora do escopo permitido')
        }
      }
    }

    let resolvedJobFunctionId: string | null = null
    if (jobFunctionId) {
      const jobFunction = await this.risksRepository.findJobFunctionById(jobFunctionId)
      if (!jobFunction) {
        throw new NotFoundException({
          error: { code: 'FUNCTION_NOT_FOUND', message: 'Função não encontrada', statusCode: 404 },
        })
      }

      if (!jobFunction.isActive) {
        this.deny('Não é possível vincular risco a uma função inativa')
      }

      if (jobFunction.tenantId !== unit.tenantId || jobFunction.companyId !== unit.companyId) {
        this.deny('A função precisa pertencer à mesma empresa da unidade do risco')
      }

      const linkedUnitIds = jobFunction.functionUnits?.map((link: any) => link.unitId) ?? []
      const hasExplicitLink = linkedUnitIds.includes(unit.id)
      const hasLegacyLink = jobFunction.unitId === unit.id
      if (!hasExplicitLink && !hasLegacyLink) {
        this.deny('A função precisa estar vinculada à unidade do risco')
      }

      resolvedJobFunctionId = jobFunction.id
    }

    return {
      tenantId: unit.tenantId,
      companyId: unit.companyId,
      unitId: unit.id,
      jobFunctionId: resolvedJobFunctionId,
    }
  }

  private async getRiskOrThrow(id: string) {
    const risk = await this.risksRepository.findById(id)
    if (!risk) {
      throw new NotFoundException({
        error: { code: 'RISK_NOT_FOUND', message: 'Risco não encontrado', statusCode: 404 },
      })
    }
    return risk
  }

  private assertRiskAccess(currentUser: RequestUser, risk: any) {
    if (currentUser.role === Role.SUPER_ADMIN) return
    if (!currentUser.tenantId || currentUser.tenantId !== risk.tenantId) {
      this.deny('Risco fora do ambiente autenticado')
    }

    if (currentUser.role === Role.TENANT_ADMIN) return

    if (currentUser.companyIds?.length && !currentUser.companyIds.includes(risk.companyId)) {
      this.deny('Empresa fora do escopo permitido')
    }

    if (currentUser.unitIds?.length && !currentUser.unitIds.includes(risk.unitId)) {
      this.deny('Unidade fora do escopo permitido')
    }
  }

  private mapToEntity(risk: any): RiskEntity {
    return {
      id: risk.id,
      tenantId: risk.tenantId,
      companyId: risk.companyId,
      companyName: risk.company?.tradeName ?? risk.company?.name ?? null,
      unitId: risk.unitId,
      unitName: risk.unit?.name ?? '—',
      jobFunctionId: risk.jobFunctionId ?? null,
      jobFunctionName: risk.jobFunction?.name ?? null,
      name: risk.name,
      type: risk.type,
      level: risk.level,
      probability: risk.probability,
      severity: risk.severity,
      description: risk.description ?? null,
      controlMeasures: risk.controlMeasures ?? null,
      isActive: risk.isActive,
      createdAt: risk.createdAt,
      updatedAt: risk.updatedAt,
    }
  }

  private deny(message: string): never {
    throw new ForbiddenException({
      error: { code: 'FORBIDDEN', message, statusCode: 403 },
    })
  }
}
