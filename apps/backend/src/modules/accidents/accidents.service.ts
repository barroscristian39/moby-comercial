import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { AuditAction } from '@prisma/client'
import {
  AccidentSeverity,
  AccidentStatus,
  AccidentType,
  PaginationDto,
  RequestUser,
  Role,
} from '@moby/shared'
import { randomUUID } from 'crypto'
import { AuthorizationService } from '../../common/authorization/authorization.service'
import { AuditService } from '../audit/audit.service'
import { CreateAccidentDto } from './dto/create-accident.dto'
import { UploadAccidentEvidenceDto } from './dto/upload-accident-evidence.dto'
import { UpdateAccidentDto } from './dto/update-accident.dto'
import { AccidentEvidenceEntity } from './entities/accident-evidence.entity'
import { AccidentEntity } from './entities/accident.entity'
import { AccidentListEntity } from './entities/accident-list.entity'
import { AccidentsRepository } from './accidents.repository'

const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024

type UploadedAccidentEvidence = {
  filename: string
  mimetype?: string
  buffer: Buffer
}

@Injectable()
export class AccidentsService {
  constructor(
    private readonly accidentsRepository: AccidentsRepository,
    private readonly authorizationService: AuthorizationService,
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
      data: items.map((accident) => this.mapToListEntity(accident)),
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
    const injuredBodyPartSummary = this.resolveInjuredBodyPartSummary(dto)

    const created = await this.accidentsRepository.create({
      tenantId: scope.tenantId,
      companyId: scope.companyId,
      unitId: scope.unitId,
      employeeId: scope.employeeId,
      jobFunctionId: scope.jobFunctionId,
      code,
      regional: dto.regional,
      unitManagerName: dto.unitManagerName,
      salary: dto.salary,
      employeePhone: dto.employeePhone,
      workSchedule: dto.workSchedule,
      totalTimeInRole: dto.totalTimeInRole,
      activityType: dto.activityType as any,
      previousAccident: dto.previousAccident ?? false,
      previousAccidentDescription: dto.previousAccidentDescription,
      occurredAt: new Date(dto.occurredAt),
      reportedAt: dto.reportedAt ? new Date(dto.reportedAt) : new Date(),
      location: dto.location,
      occurrenceAddress: dto.occurrenceAddress,
      accidentType: dto.accidentType as any,
      typicalSubtypes: dto.typicalSubtypes as any,
      typicalSubtypeOther: dto.typicalSubtypeOther,
      commuteSubtypes: dto.commuteSubtypes as any,
      commuteSubtypeOther: dto.commuteSubtypeOther,
      workJourneyType: dto.workJourneyType as any,
      scheduleChangeStart: dto.scheduleChangeStart,
      scheduleChangeEnd: dto.scheduleChangeEnd,
      severity: dto.severity as any,
      status: status as any,
      description: dto.description,
      injuredSide: dto.injuredSide as any,
      injuredBodyParts: dto.injuredBodyParts as any,
      injuredBodyPartOther: dto.injuredBodyPartOther,
      injuredBodyPart: injuredBodyPartSummary,
      medicalCareProvided: dto.medicalCareProvided ?? false,
      medicalCareTime: dto.medicalCareTime,
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
      metadata: { accident: this.buildAccidentAuditSummary(created) },
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
    const injuredBodyPartSummary = this.resolveInjuredBodyPartSummary(dto, accident)

    const updated = await this.accidentsRepository.update(id, {
      tenantId: scope.tenantId,
      companyId: scope.companyId,
      unitId: scope.unitId,
      employeeId: scope.employeeId,
      jobFunctionId: scope.jobFunctionId,
      regional: dto.regional,
      unitManagerName: dto.unitManagerName,
      salary: dto.salary,
      employeePhone: dto.employeePhone,
      workSchedule: dto.workSchedule,
      totalTimeInRole: dto.totalTimeInRole,
      activityType: dto.activityType as any,
      previousAccident: dto.previousAccident,
      previousAccidentDescription: dto.previousAccidentDescription,
      occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : undefined,
      reportedAt: dto.reportedAt ? new Date(dto.reportedAt) : undefined,
      location: dto.location,
      occurrenceAddress: dto.occurrenceAddress,
      accidentType: dto.accidentType as any,
      typicalSubtypes: dto.typicalSubtypes as any,
      typicalSubtypeOther: dto.typicalSubtypeOther,
      commuteSubtypes: dto.commuteSubtypes as any,
      commuteSubtypeOther: dto.commuteSubtypeOther,
      workJourneyType: dto.workJourneyType as any,
      scheduleChangeStart: dto.scheduleChangeStart,
      scheduleChangeEnd: dto.scheduleChangeEnd,
      severity: dto.severity as any,
      status: dto.status as any,
      description: dto.description,
      injuredSide: dto.injuredSide as any,
      injuredBodyParts: dto.injuredBodyParts as any,
      injuredBodyPartOther: dto.injuredBodyPartOther,
      injuredBodyPart: injuredBodyPartSummary,
      medicalCareProvided: dto.medicalCareProvided,
      medicalCareTime: dto.medicalCareTime,
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
        previous: this.buildAccidentAuditSummary(accident),
        next: this.buildAccidentAuditSummary(updated),
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
      metadata: { accident: this.buildAccidentAuditSummary(accident) },
    })
  }

  async listEvidences(id: string, currentUser: RequestUser): Promise<{ data: AccidentEvidenceEntity[] }> {
    const accident = await this.getAccidentOrThrow(id)
    this.assertAccidentAccess(currentUser, accident)

    const evidences = await this.accidentsRepository.findEvidencesByAccidentId(id)
    return { data: evidences.map((evidence) => this.mapEvidenceToEntity(evidence)) }
  }

  async uploadEvidence(
    id: string,
    dto: UploadAccidentEvidenceDto,
    file: UploadedAccidentEvidence,
    currentUser: RequestUser,
  ): Promise<{ data: AccidentEvidenceEntity }> {
    const accident = await this.getAccidentOrThrow(id)
    this.assertAccidentAccess(currentUser, accident)
    this.assertEvidenceUpload(file)

    const created = await this.accidentsRepository.createEvidence({
      id: randomUUID(),
      tenantId: accident.tenantId,
      companyId: accident.companyId,
      accidentId: accident.id,
      evidenceType: dto.evidenceType as any,
      fileName: file.filename,
      mimeType: file.mimetype ?? this.guessEvidenceMimeType(file.filename),
      fileSize: file.buffer.length,
      fileContent: file.buffer,
      notes: dto.notes,
      createdBy: currentUser.userId,
      isActive: true,
    })

    await this.auditService.record({
      tenantId: created.tenantId,
      actorUserId: currentUser.userId,
      action: AuditAction.CREATE,
      entityType: 'accident_evidences',
      entityId: created.id,
      metadata: {
        accidentId: accident.id,
        evidenceType: created.evidenceType,
        fileName: created.fileName,
        fileSize: created.fileSize,
      },
    })

    return { data: this.mapEvidenceToEntity(created) }
  }

  async getEvidenceFile(
    accidentId: string,
    evidenceId: string,
    currentUser: RequestUser,
  ) {
    const accident = await this.getAccidentOrThrow(accidentId)
    this.assertAccidentAccess(currentUser, accident)

    const evidence = await this.getEvidenceOrThrow(evidenceId)
    if (evidence.accidentId !== accidentId) {
      throw new NotFoundException({
        error: { code: 'ACCIDENT_EVIDENCE_NOT_FOUND', message: 'Evidência não encontrada', statusCode: 404 },
      })
    }

    return {
      buffer: evidence.fileContent,
      filename: evidence.fileName,
      contentType: evidence.mimeType,
    }
  }

  async deleteEvidence(accidentId: string, evidenceId: string, currentUser: RequestUser): Promise<void> {
    const accident = await this.getAccidentOrThrow(accidentId)
    this.assertAccidentAccess(currentUser, accident)

    const evidence = await this.getEvidenceOrThrow(evidenceId)
    if (evidence.accidentId !== accidentId) {
      throw new NotFoundException({
        error: { code: 'ACCIDENT_EVIDENCE_NOT_FOUND', message: 'Evidência não encontrada', statusCode: 404 },
      })
    }

    const deleted = await this.accidentsRepository.softDeleteEvidence(evidenceId, currentUser.userId)
    await this.auditService.record({
      tenantId: deleted.tenantId,
      actorUserId: currentUser.userId,
      action: AuditAction.DELETE,
      entityType: 'accident_evidences',
      entityId: deleted.id,
      metadata: {
        accidentId,
        evidenceType: deleted.evidenceType,
        fileName: deleted.fileName,
      },
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
    return this.authorizationService.resolveCompanyScope(currentUser, requestedCompanyId)
  }

  private resolveUnitScope(currentUser: RequestUser, requestedUnitId?: string) {
    return this.authorizationService.resolveUnitScope(currentUser, requestedUnitId)
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
        this.authorizationService.assertCompanyInScope(currentUser, employee.companyId)
        this.authorizationService.assertUnitInScope(currentUser, employee.unitId)
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

  private async getEvidenceOrThrow(id: string) {
    const evidence = await this.accidentsRepository.findEvidenceById(id)
    if (!evidence) {
      throw new NotFoundException({
        error: { code: 'ACCIDENT_EVIDENCE_NOT_FOUND', message: 'Evidência não encontrada', statusCode: 404 },
      })
    }

    return evidence
  }

  private assertAccidentAccess(currentUser: RequestUser, accident: any) {
    if (currentUser.role === Role.SUPER_ADMIN) return

    if (!currentUser.tenantId || currentUser.tenantId !== accident.tenantId) {
      this.deny('Acidente fora do ambiente autenticado')
    }

    if (currentUser.role === Role.TENANT_ADMIN) return

    this.authorizationService.assertCompanyInScope(currentUser, accident.companyId)
    this.authorizationService.assertUnitInScope(currentUser, accident.unitId)
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
      regional: accident.regional ?? null,
      unitManagerName: accident.unitManagerName ?? null,
      salary: accident.salary ?? null,
      employeePhone: accident.employeePhone ?? null,
      workSchedule: accident.workSchedule ?? null,
      totalTimeInRole: accident.totalTimeInRole ?? null,
      activityType: accident.activityType ?? null,
      previousAccident: accident.previousAccident ?? false,
      previousAccidentDescription: accident.previousAccidentDescription ?? null,
      occurredAt: accident.occurredAt,
      reportedAt: accident.reportedAt,
      location: accident.location,
      occurrenceAddress: accident.occurrenceAddress ?? null,
      accidentType: accident.accidentType,
      typicalSubtypes: accident.typicalSubtypes ?? [],
      typicalSubtypeOther: accident.typicalSubtypeOther ?? null,
      commuteSubtypes: accident.commuteSubtypes ?? [],
      commuteSubtypeOther: accident.commuteSubtypeOther ?? null,
      workJourneyType: accident.workJourneyType ?? null,
      scheduleChangeStart: accident.scheduleChangeStart ?? null,
      scheduleChangeEnd: accident.scheduleChangeEnd ?? null,
      severity: accident.severity,
      status: accident.status,
      description: accident.description,
      injuredSide: accident.injuredSide ?? null,
      injuredBodyParts: accident.injuredBodyParts ?? [],
      injuredBodyPartOther: accident.injuredBodyPartOther ?? null,
      injuredBodyPart: accident.injuredBodyPart ?? null,
      medicalCareProvided: accident.medicalCareProvided,
      medicalCareTime: accident.medicalCareTime ?? null,
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

  private mapToListEntity(accident: any): AccidentListEntity {
    return {
      id: accident.id,
      tenantId: accident.tenantId,
      companyId: accident.companyId,
      companyName: accident.company?.tradeName ?? accident.company?.name ?? null,
      unitId: accident.unitId,
      unitName: accident.unit?.name ?? '—',
      employeeId: accident.employeeId,
      employeeName: accident.employee?.name ?? '—',
      employeeCpfMasked: this.maskCpf(accident.employee?.cpf),
      employeeRegistration: accident.employee?.registration ?? null,
      code: accident.code,
      occurredAt: accident.occurredAt,
      accidentType: accident.accidentType,
      severity: accident.severity,
      status: accident.status,
      leaveRequired: accident.leaveRequired,
      leaveDays: accident.leaveDays,
      isActive: accident.isActive,
    }
  }

  private mapEvidenceToEntity(evidence: any): AccidentEvidenceEntity {
    return {
      id: evidence.id,
      tenantId: evidence.tenantId,
      companyId: evidence.companyId,
      accidentId: evidence.accidentId,
      evidenceType: evidence.evidenceType,
      fileName: evidence.fileName,
      mimeType: evidence.mimeType,
      fileSize: evidence.fileSize,
      notes: evidence.notes ?? null,
      createdBy: evidence.createdBy,
      createdAt: evidence.createdAt,
      isActive: evidence.isActive,
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

  private buildAccidentAuditSummary(accident: any) {
    return {
      id: accident.id,
      tenantId: accident.tenantId,
      companyId: accident.companyId,
      unitId: accident.unitId,
      employeeId: accident.employeeId,
      code: accident.code,
      accidentType: accident.accidentType,
      severity: accident.severity,
      status: accident.status,
      occurredAt: accident.occurredAt,
      reportedAt: accident.reportedAt,
      leaveRequired: accident.leaveRequired,
      leaveDays: accident.leaveDays,
      catIssued: accident.catIssued,
      isActive: accident.isActive,
    }
  }

  private maskCpf(value: string | null | undefined) {
    if (!value) return null

    const digits = value.replace(/\D/g, '')
    if (digits.length !== 11) {
      return '***.***.***-**'
    }

    return `${digits.slice(0, 3)}.***.***-${digits.slice(-2)}`
  }

  private resolveInjuredBodyPartSummary(
    dto: Pick<
      Partial<CreateAccidentDto & UpdateAccidentDto>,
      'injuredBodyPart' | 'injuredBodyParts' | 'injuredBodyPartOther' | 'injuredSide'
    >,
    accident?: any,
  ) {
    const bodyParts = dto.injuredBodyParts ?? accident?.injuredBodyParts
    const otherText = dto.injuredBodyPartOther ?? accident?.injuredBodyPartOther
    const side = dto.injuredSide ?? accident?.injuredSide
    const explicitText = dto.injuredBodyPart

    if (explicitText !== undefined) {
      return explicitText
    }

    if (!bodyParts && !otherText && !side) {
      return undefined
    }

    const normalizedParts = Array.isArray(bodyParts)
      ? bodyParts.map((item) => this.getBodyPartLabel(item)).filter(Boolean)
      : []

    if (otherText) {
      normalizedParts.push(otherText)
    }

    const uniqueParts = [...new Set(normalizedParts)]
    const summary = uniqueParts.length > 0 ? uniqueParts.join(', ') : null

    if (!summary) {
      return side ? this.getInjuredSideLabel(side) : null
    }

    return side ? `${summary} (${this.getInjuredSideLabel(side)})` : summary
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

  private getBodyPartLabel(value: string) {
    const labels: Record<string, string> = {
      HEAD: 'Cabeça',
      FACE: 'Face',
      EYE: 'Olho',
      NOSE: 'Nariz',
      MOUTH: 'Boca',
      NECK: 'Pescoço',
      SHOULDER: 'Ombro',
      ARM: 'Braço',
      ELBOW: 'Cotovelo',
      WRIST: 'Punho',
      HAND: 'Mão',
      FINGER: 'Dedo',
      THORAX: 'Tórax',
      ABDOMEN: 'Abdome',
      BACK: 'Costas',
      COCCYX: 'Cóccix',
      THIGH: 'Coxa',
      LEG: 'Perna',
      KNEE: 'Joelho',
      ANKLE: 'Tornozelo',
      FOOT: 'Pé',
      OTHER: 'Outros',
    }

    return labels[value] ?? value
  }

  private getInjuredSideLabel(value: string) {
    const labels: Record<string, string> = {
      LEFT: 'lado esquerdo',
      RIGHT: 'lado direito',
      BOTH: 'ambos os lados',
    }

    return labels[value] ?? value
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

  private assertEvidenceUpload(file: UploadedAccidentEvidence) {
    const lowerName = file.filename.toLowerCase()
    const mimeType = file.mimetype ?? this.guessEvidenceMimeType(file.filename)

    if (!lowerName.match(/\.(pdf|png|jpe?g|webp)$/i)) {
      throw new BadRequestException({
        error: {
          code: 'INVALID_ACCIDENT_EVIDENCE_UPLOAD',
          message: 'Envie apenas arquivos PDF ou imagens (PNG, JPG ou WEBP)',
          statusCode: 400,
        },
      })
    }

    if (!(mimeType === 'application/pdf' || mimeType.startsWith('image/'))) {
      throw new BadRequestException({
        error: {
          code: 'INVALID_ACCIDENT_EVIDENCE_UPLOAD',
          message: 'Tipo de arquivo inválido para evidência',
          statusCode: 400,
        },
      })
    }

    if (!file.buffer.length) {
      throw new BadRequestException({
        error: {
          code: 'INVALID_ACCIDENT_EVIDENCE_UPLOAD',
          message: 'O arquivo enviado está vazio',
          statusCode: 400,
        },
      })
    }

    if (file.buffer.length > MAX_EVIDENCE_BYTES) {
      throw new BadRequestException({
        error: {
          code: 'INVALID_ACCIDENT_EVIDENCE_UPLOAD',
          message: 'Cada evidência deve ter no máximo 10 MB',
          statusCode: 400,
        },
      })
    }
  }

  private guessEvidenceMimeType(filename: string) {
    const lowerName = filename.toLowerCase()
    if (lowerName.endsWith('.pdf')) return 'application/pdf'
    if (lowerName.endsWith('.png')) return 'image/png'
    if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) return 'image/jpeg'
    if (lowerName.endsWith('.webp')) return 'image/webp'
    return 'application/octet-stream'
  }

  private deny(message: string): never {
    throw new ForbiddenException({
      error: { code: 'FORBIDDEN', message, statusCode: 403 },
    })
  }
}
