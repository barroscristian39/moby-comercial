import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { AuditAction } from '@prisma/client'
import {
  AccidentSeverity,
  AccidentStatus,
  AccidentType,
  PaginationDto,
  RequestUser,
  Role,
} from '@moby/shared'
import { AuditService } from '../audit/audit.service'
import { CreateAccidentDto } from './dto/create-accident.dto'
import { UpdateAccidentDto } from './dto/update-accident.dto'
import { AccidentEntity } from './entities/accident.entity'
import { AccidentsRepository } from './accidents.repository'

@Injectable()
export class AccidentsService {
  constructor(
    private readonly accidentsRepository: AccidentsRepository,
    private readonly auditService: AuditService,
  ) {}

  async findAll(
    currentUser: RequestUser,
    pagination: PaginationDto,
    filters: {
      tenantId?: string
      companyId?: string
      unitId?: string
      employeeId?: string
      search?: string
      status?: AccidentStatus
      severity?: AccidentSeverity
      accidentType?: AccidentType
      fromDate?: string
      toDate?: string
    },
  ) {
    const tenantId = currentUser.role === Role.SUPER_ADMIN ? filters.tenantId : currentUser.tenantId ?? undefined
    const companyIds = this.resolveCompanyScope(currentUser, filters.companyId)
    const unitIds = this.resolveUnitScope(currentUser, filters.unitId)

    const { items, total } = await this.accidentsRepository.findAll({
      tenantId,
      companyIds,
      unitIds,
      page: pagination.page,
      perPage: pagination.perPage,
      employeeId: filters.employeeId,
      search: filters.search,
      status: filters.status,
      severity: filters.severity,
      accidentType: filters.accidentType,
      fromDate: filters.fromDate ? new Date(filters.fromDate) : undefined,
      toDate: filters.toDate ? new Date(filters.toDate) : undefined,
    })

    return {
      data: items.map((accident) => this.mapToEntity(accident)),
      meta: {
        total,
        page: pagination.page,
        perPage: pagination.perPage,
        totalPages: Math.ceil(total / pagination.perPage),
      },
    }
  }

  async findOne(id: string, currentUser: RequestUser): Promise<{ data: AccidentEntity }> {
    const accident = await this.getAccidentOrThrow(id)
    this.assertAccidentAccess(currentUser, accident)
    return { data: this.mapToEntity(accident) }
  }

  async create(dto: CreateAccidentDto, currentUser: RequestUser): Promise<{ data: AccidentEntity }> {
    const scope = await this.resolveScope(dto.employeeId, currentUser)
    const code = this.generateAccidentCode()
    const status = dto.status ?? AccidentStatus.REPORTED
    const leaveRequired = dto.leaveRequired ?? false
    const leaveDays = leaveRequired ? dto.leaveDays ?? 0 : 0

    const created = await this.accidentsRepository.create({
      tenantId: scope.tenantId,
      companyId: scope.companyId,
      unitId: scope.unitId,
      employeeId: scope.employeeId,
      jobFunctionId: scope.jobFunctionId,
      code,
      occurredAt: new Date(dto.occurredAt),
      reportedAt: dto.reportedAt ? new Date(dto.reportedAt) : new Date(),
      location: dto.location,
      accidentType: dto.accidentType as any,
      severity: dto.severity as any,
      status: status as any,
      description: dto.description,
      injuredBodyPart: dto.injuredBodyPart,
      medicalCareProvided: dto.medicalCareProvided ?? false,
      leaveRequired,
      leaveDays,
      catIssued: dto.catIssued ?? false,
      catNumber: dto.catNumber,
      witnesses: dto.witnesses,
      immediateActions: dto.immediateActions,
      investigatorName: dto.investigatorName,
      investigationStartedAt: dto.investigationStartedAt ? new Date(dto.investigationStartedAt) : undefined,
      immediateCause: dto.immediateCause,
      rootCause: dto.rootCause,
      contributingFactors: dto.contributingFactors,
      correctiveActions: dto.correctiveActions,
      preventiveMeasures: dto.preventiveMeasures,
      managerNotes: dto.managerNotes,
      recommendations: dto.recommendations,
      conclusionSummary: dto.conclusionSummary,
      closureDate: status === AccidentStatus.CLOSED
        ? dto.closureDate ? new Date(dto.closureDate) : new Date()
        : undefined,
      isActive: true,
    })

    await this.auditService.record({
      tenantId: created.tenantId,
      actorUserId: currentUser.userId,
      action: AuditAction.CREATE,
      entityType: 'accidents',
      entityId: created.id,
      metadata: { accident: this.mapToEntity(created) },
    })

    return { data: this.mapToEntity(created) }
  }

  async update(id: string, dto: UpdateAccidentDto, currentUser: RequestUser): Promise<{ data: AccidentEntity }> {
    const accident = await this.getAccidentOrThrow(id)
    this.assertAccidentAccess(currentUser, accident)

    const scope = dto.employeeId
      ? await this.resolveScope(dto.employeeId, currentUser)
      : {
          tenantId: accident.tenantId,
          companyId: accident.companyId,
          unitId: accident.unitId,
          employeeId: accident.employeeId,
          jobFunctionId: accident.jobFunctionId,
        }

    const nextStatus = dto.status ?? accident.status
    const leaveRequired = dto.leaveRequired ?? accident.leaveRequired
    const leaveDays = leaveRequired ? dto.leaveDays ?? accident.leaveDays : 0

    const updated = await this.accidentsRepository.update(id, {
      tenantId: scope.tenantId,
      companyId: scope.companyId,
      unitId: scope.unitId,
      employeeId: scope.employeeId,
      jobFunctionId: scope.jobFunctionId,
      occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : undefined,
      reportedAt: dto.reportedAt ? new Date(dto.reportedAt) : undefined,
      location: dto.location,
      accidentType: dto.accidentType as any,
      severity: dto.severity as any,
      status: dto.status as any,
      description: dto.description,
      injuredBodyPart: dto.injuredBodyPart,
      medicalCareProvided: dto.medicalCareProvided,
      leaveRequired,
      leaveDays,
      catIssued: dto.catIssued,
      catNumber: dto.catNumber,
      witnesses: dto.witnesses,
      immediateActions: dto.immediateActions,
      investigatorName: dto.investigatorName,
      investigationStartedAt: dto.investigationStartedAt ? new Date(dto.investigationStartedAt) : dto.investigationStartedAt === null ? null : undefined,
      immediateCause: dto.immediateCause,
      rootCause: dto.rootCause,
      contributingFactors: dto.contributingFactors,
      correctiveActions: dto.correctiveActions,
      preventiveMeasures: dto.preventiveMeasures,
      managerNotes: dto.managerNotes,
      recommendations: dto.recommendations,
      conclusionSummary: dto.conclusionSummary,
      closureDate: dto.closureDate !== undefined
        ? dto.closureDate
          ? new Date(dto.closureDate)
          : null
        : nextStatus === AccidentStatus.CLOSED && !accident.closureDate
          ? new Date()
          : undefined,
      isActive: dto.isActive,
    })

    await this.auditService.record({
      tenantId: updated.tenantId,
      actorUserId: currentUser.userId,
      action: AuditAction.UPDATE,
      entityType: 'accidents',
      entityId: updated.id,
      metadata: {
        previous: this.mapToEntity(accident),
        next: this.mapToEntity(updated),
      },
    })

    return { data: this.mapToEntity(updated) }
  }

  async remove(id: string, currentUser: RequestUser): Promise<void> {
    const accident = await this.getAccidentOrThrow(id)
    this.assertAccidentAccess(currentUser, accident)

    const deleted = await this.accidentsRepository.softDelete(id, currentUser.userId)
    await this.auditService.record({
      tenantId: deleted.tenantId,
      actorUserId: currentUser.userId,
      action: AuditAction.DELETE,
      entityType: 'accidents',
      entityId: deleted.id,
      metadata: { accident: this.mapToEntity(accident) },
    })
  }

  async getConclusionReport(id: string, currentUser: RequestUser) {
    const accident = await this.getAccidentOrThrow(id)
    this.assertAccidentAccess(currentUser, accident)

    const occurredAt = accident.occurredAt.toISOString()
    const closureDate = accident.closureDate?.toISOString() ?? null
    const employeeName = accident.employee?.name ?? 'Colaborador não identificado'
    const companyName = accident.company?.tradeName ?? accident.company?.name ?? 'Empresa não identificada'
    const unitName = accident.unit?.name ?? 'Unidade não identificada'

    const narrative = [
      `${employeeName} sofreu um ${this.getAccidentTypeLabel(accident.accidentType)} em ${this.formatDateTime(accident.occurredAt)} no local ${accident.location}.`,
      `O registro formal da ocorrência aconteceu em ${this.formatDateTime(accident.reportedAt)}, com gravidade ${this.getSeverityLabel(accident.severity)} e status atual ${this.getStatusLabel(accident.status)}.`,
      accident.immediateCause
        ? `A investigação apontou como causa imediata: ${accident.immediateCause}.`
        : 'A causa imediata ainda não foi detalhada pela investigação.',
      accident.rootCause
        ? `Como causa raiz, foi registrado: ${accident.rootCause}.`
        : 'A causa raiz ainda não foi concluída.',
      accident.correctiveActions
        ? `As ações corretivas definidas foram: ${accident.correctiveActions}.`
        : 'Ainda não há ações corretivas formalizadas.',
      accident.status === AccidentStatus.CLOSED
        ? `O caso foi encerrado em ${closureDate ? this.formatDateTime(closureDate) : 'data não informada'}.`
        : 'O caso permanece em tratamento e ainda depende da conclusão formal.',
      accident.conclusionSummary
        ? `Conclusão do caso: ${accident.conclusionSummary}.`
        : 'O relatório ainda aguarda a conclusão final da investigação.',
    ]

    return {
      data: {
        accidentId: accident.id,
        code: accident.code,
        generatedAt: new Date().toISOString(),
        header: {
          companyName,
          unitName,
          employeeName,
          employeeCpf: accident.employee?.cpf ?? null,
          employeeRegistration: accident.employee?.registration ?? null,
          jobFunctionName: accident.jobFunction?.name ?? null,
        },
        occurrence: {
          occurredAt,
          reportedAt: accident.reportedAt.toISOString(),
          location: accident.location,
          accidentType: accident.accidentType,
          accidentTypeLabel: this.getAccidentTypeLabel(accident.accidentType),
          severity: accident.severity,
          severityLabel: this.getSeverityLabel(accident.severity),
          description: accident.description,
          injuredBodyPart: accident.injuredBodyPart ?? null,
          medicalCareProvided: accident.medicalCareProvided,
          leaveRequired: accident.leaveRequired,
          leaveDays: accident.leaveDays,
          catIssued: accident.catIssued,
          catNumber: accident.catNumber ?? null,
        },
        investigation: {
          investigatorName: accident.investigatorName ?? null,
          investigationStartedAt: accident.investigationStartedAt?.toISOString() ?? null,
          witnesses: accident.witnesses ?? null,
          immediateActions: accident.immediateActions ?? null,
          immediateCause: accident.immediateCause ?? null,
          rootCause: accident.rootCause ?? null,
          contributingFactors: accident.contributingFactors ?? null,
          correctiveActions: accident.correctiveActions ?? null,
          preventiveMeasures: accident.preventiveMeasures ?? null,
          managerNotes: accident.managerNotes ?? null,
          recommendations: accident.recommendations ?? null,
        },
        conclusion: {
          status: accident.status,
          statusLabel: this.getStatusLabel(accident.status),
          closureDate,
          summary: accident.conclusionSummary ?? null,
        },
        narrative,
      },
    }
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

  private async resolveScope(employeeId: string, currentUser: RequestUser) {
    const employee = await this.accidentsRepository.findEmployeeById(employeeId)
    if (!employee) {
      throw new NotFoundException({
        error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Colaborador não encontrado', statusCode: 404 },
      })
    }

    if (currentUser.role !== Role.SUPER_ADMIN) {
      if (!currentUser.tenantId || currentUser.tenantId !== employee.tenantId) {
        this.deny('Colaborador fora do ambiente autenticado')
      }

      if (currentUser.role !== Role.TENANT_ADMIN) {
        if (currentUser.companyIds?.length && !currentUser.companyIds.includes(employee.companyId)) {
          this.deny('Empresa fora do escopo permitido')
        }

        if (currentUser.unitIds?.length && !currentUser.unitIds.includes(employee.unitId)) {
          this.deny('Unidade fora do escopo permitido')
        }
      }
    }

    return {
      tenantId: employee.tenantId,
      companyId: employee.companyId,
      unitId: employee.unitId,
      employeeId: employee.id,
      jobFunctionId: employee.jobFunctionId,
    }
  }

  private async getAccidentOrThrow(id: string) {
    const accident = await this.accidentsRepository.findById(id)
    if (!accident) {
      throw new NotFoundException({
        error: { code: 'ACCIDENT_NOT_FOUND', message: 'Acidente não encontrado', statusCode: 404 },
      })
    }
    return accident
  }

  private assertAccidentAccess(currentUser: RequestUser, accident: any) {
    if (currentUser.role === Role.SUPER_ADMIN) return

    if (!currentUser.tenantId || currentUser.tenantId !== accident.tenantId) {
      this.deny('Acidente fora do ambiente autenticado')
    }

    if (currentUser.role === Role.TENANT_ADMIN) return

    if (currentUser.companyIds?.length && !currentUser.companyIds.includes(accident.companyId)) {
      this.deny('Empresa fora do escopo permitido')
    }

    if (currentUser.unitIds?.length && !currentUser.unitIds.includes(accident.unitId)) {
      this.deny('Unidade fora do escopo permitido')
    }
  }

  private mapToEntity(accident: any): AccidentEntity {
    return {
      id: accident.id,
      tenantId: accident.tenantId,
      companyId: accident.companyId,
      companyName: accident.company?.tradeName ?? accident.company?.name ?? null,
      unitId: accident.unitId,
      unitName: accident.unit?.name ?? '—',
      employeeId: accident.employeeId,
      employeeName: accident.employee?.name ?? '—',
      employeeCpf: accident.employee?.cpf ?? '',
      employeeRegistration: accident.employee?.registration ?? null,
      jobFunctionId: accident.jobFunctionId ?? null,
      jobFunctionName: accident.jobFunction?.name ?? null,
      code: accident.code,
      occurredAt: accident.occurredAt,
      reportedAt: accident.reportedAt,
      location: accident.location,
      accidentType: accident.accidentType,
      severity: accident.severity,
      status: accident.status,
      description: accident.description,
      injuredBodyPart: accident.injuredBodyPart ?? null,
      medicalCareProvided: accident.medicalCareProvided,
      leaveRequired: accident.leaveRequired,
      leaveDays: accident.leaveDays,
      catIssued: accident.catIssued,
      catNumber: accident.catNumber ?? null,
      witnesses: accident.witnesses ?? null,
      immediateActions: accident.immediateActions ?? null,
      investigatorName: accident.investigatorName ?? null,
      investigationStartedAt: accident.investigationStartedAt ?? null,
      immediateCause: accident.immediateCause ?? null,
      rootCause: accident.rootCause ?? null,
      contributingFactors: accident.contributingFactors ?? null,
      correctiveActions: accident.correctiveActions ?? null,
      preventiveMeasures: accident.preventiveMeasures ?? null,
      managerNotes: accident.managerNotes ?? null,
      recommendations: accident.recommendations ?? null,
      conclusionSummary: accident.conclusionSummary ?? null,
      closureDate: accident.closureDate ?? null,
      isActive: accident.isActive,
      createdAt: accident.createdAt,
      updatedAt: accident.updatedAt,
    }
  }

  private generateAccidentCode() {
    const now = new Date()
    const pad = (value: number) => String(value).padStart(2, '0')
    const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
    const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase()
    return `ACC-${date}-${time}-${suffix}`
  }

  private getAccidentTypeLabel(type: AccidentType | string) {
    const labels: Record<string, string> = {
      [AccidentType.TYPICAL]: 'acidente típico',
      [AccidentType.COMMUTE]: 'acidente de trajeto',
      [AccidentType.OCCUPATIONAL_DISEASE]: 'doença ocupacional',
      [AccidentType.NEAR_MISS]: 'quase acidente',
    }

    return labels[type] ?? type
  }

  private getSeverityLabel(severity: AccidentSeverity | string) {
    const labels: Record<string, string> = {
      [AccidentSeverity.MINOR]: 'leve',
      [AccidentSeverity.MODERATE]: 'moderada',
      [AccidentSeverity.SERIOUS]: 'grave',
      [AccidentSeverity.FATAL]: 'fatal',
    }

    return labels[severity] ?? severity
  }

  private getStatusLabel(status: AccidentStatus | string) {
    const labels: Record<string, string> = {
      [AccidentStatus.REPORTED]: 'registrado',
      [AccidentStatus.UNDER_INVESTIGATION]: 'em investigação',
      [AccidentStatus.ACTION_PLAN_DEFINED]: 'plano de ação definido',
      [AccidentStatus.CLOSED]: 'encerrado',
    }

    return labels[status] ?? status
  }

  private formatDateTime(value: Date | string) {
    const date = value instanceof Date ? value : new Date(value)
    return date.toLocaleString('pt-BR')
  }

  private deny(message: string): never {
    throw new ForbiddenException({
      error: { code: 'FORBIDDEN', message, statusCode: 403 },
    })
  }
}
