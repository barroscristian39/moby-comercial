import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { Permission, PaginationDto, RequestUser, Role } from '@moby/shared'
import { CreateOccupationalExamDto } from './dto/create-occupational-exam.dto'
import { UpdateOccupationalExamDto } from './dto/update-occupational-exam.dto'
import { OccupationalExamEntity } from './entities/occupational-exam.entity'
import { OccupationalExamsRepository } from './occupational-exams.repository'

@Injectable()
export class OccupationalExamsService {
  constructor(private readonly examsRepository: OccupationalExamsRepository) {}

  async findAll(
    currentUser: RequestUser,
    pagination: PaginationDto,
    filters: { employeeId?: string; search?: string; isActive?: boolean; status?: 'expired' | 'expiring' | 'valid' },
  ) {
    const scope = this.resolveScope(currentUser)
    const { items, total } = await this.examsRepository.findAll({
      ...scope,
      ...filters,
      page: pagination.page,
      perPage: pagination.perPage,
    })

    return {
      data: items.map((item) => this.mapToEntity(item)),
      meta: {
        total,
        page: pagination.page,
        perPage: pagination.perPage,
        totalPages: Math.ceil(total / pagination.perPage),
      },
    }
  }

  async findOne(id: string, currentUser: RequestUser) {
    const item = await this.findInUserScope(id, currentUser)
    return { data: this.mapToEntity(item) }
  }

  async create(dto: CreateOccupationalExamDto, currentUser: RequestUser) {
    const employee = await this.examsRepository.findEmployeeById(dto.employeeId)
    if (!employee) {
      throw new NotFoundException({
        error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Colaborador não encontrado', statusCode: 404 },
      })
    }
    this.assertCanAccessRecord(currentUser, employee.companyId, employee.unitId)

    const item = await this.examsRepository.create({
      tenantId: employee.tenantId,
      companyId: employee.companyId,
      unitId: employee.unitId,
      employeeId: employee.id,
      jobFunctionId: employee.jobFunctionId,
      examType: dto.examType as any,
      name: dto.name,
      provider: dto.provider,
      performedAt: dto.performedAt ? new Date(dto.performedAt) : null,
      dueDate: new Date(dto.dueDate),
      result: dto.result as any,
      asoIssued: dto.asoIssued,
      asoNumber: dto.asoNumber,
      notes: dto.notes,
    })

    return { data: this.mapToEntity(item) }
  }

  async update(id: string, dto: UpdateOccupationalExamDto, currentUser: RequestUser) {
    await this.findInUserScope(id, currentUser)
    const data: Record<string, any> = { ...dto }
    if (dto.performedAt !== undefined) data.performedAt = dto.performedAt ? new Date(dto.performedAt) : null
    if (dto.dueDate) data.dueDate = new Date(dto.dueDate)

    const updated = await this.examsRepository.update(id, data)
    return { data: this.mapToEntity(updated) }
  }

  async remove(id: string, currentUser: RequestUser) {
    await this.findInUserScope(id, currentUser)
    await this.examsRepository.softDelete(id, currentUser.userId)
  }

  private async findInUserScope(id: string, currentUser: RequestUser) {
    const scope = this.resolveScope(currentUser)
    const item = currentUser.role === Role.SUPER_ADMIN
      ? await this.examsRepository.findById(id)
      : await this.examsRepository.findByIdInScope(id, scope)

    if (!item) {
      throw new NotFoundException({
        error: { code: 'OCCUPATIONAL_EXAM_NOT_FOUND', message: 'Exame ocupacional não encontrado', statusCode: 404 },
      })
    }

    return item
  }

  private resolveScope(currentUser: RequestUser) {
    if (currentUser.role === Role.SUPER_ADMIN) {
      return {}
    }

    return {
      tenantId: currentUser.tenantId ?? undefined,
      companyIds: currentUser.companyIds,
      unitIds: currentUser.unitIds.length > 0 ? currentUser.unitIds : undefined,
    }
  }

  private assertCanAccessRecord(currentUser: RequestUser, companyId: string, unitId: string) {
    if (currentUser.role === Role.SUPER_ADMIN) return
    if (!currentUser.permissions.includes(Permission.EXAMS_WRITE)) {
      throw new ForbiddenException({
        error: { code: 'FORBIDDEN', message: 'Sem permissão para registrar exames', statusCode: 403 },
      })
    }
    if (currentUser.role === Role.TENANT_ADMIN) return
    if (!currentUser.companyIds.includes(companyId)) {
      throw new ForbiddenException({
        error: { code: 'FORBIDDEN', message: 'Empresa fora do escopo do usuário', statusCode: 403 },
      })
    }
    if (currentUser.unitIds.length > 0 && !currentUser.unitIds.includes(unitId)) {
      throw new ForbiddenException({
        error: { code: 'FORBIDDEN', message: 'Unidade fora do escopo do usuário', statusCode: 403 },
      })
    }
  }

  private mapToEntity(item: any): OccupationalExamEntity {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const inThirtyDays = new Date(today)
    inThirtyDays.setDate(inThirtyDays.getDate() + 30)
    const dueDate = new Date(item.dueDate)

    return {
      id: item.id,
      tenantId: item.tenantId,
      companyId: item.companyId,
      unitId: item.unitId,
      employeeId: item.employeeId,
      jobFunctionId: item.jobFunctionId,
      employeeName: item.employee?.name,
      unitName: item.unit?.name,
      jobFunctionName: item.jobFunction?.name ?? null,
      examType: item.examType,
      name: item.name,
      provider: item.provider,
      performedAt: item.performedAt,
      dueDate: item.dueDate,
      result: item.result,
      asoIssued: item.asoIssued,
      asoNumber: item.asoNumber,
      notes: item.notes,
      isExpired: dueDate < today,
      isExpiring: dueDate >= today && dueDate <= inThirtyDays,
      isActive: item.isActive,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }
  }
}
