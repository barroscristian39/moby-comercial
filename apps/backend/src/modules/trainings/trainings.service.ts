import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PaginationDto, Permission, RequestUser, Role } from '@moby/shared'
import { CreateTrainingDto } from './dto/create-training.dto'
import { UpdateTrainingDto } from './dto/update-training.dto'
import { TrainingEntity } from './entities/training.entity'
import { TrainingsRepository } from './trainings.repository'

@Injectable()
export class TrainingsService {
  constructor(private readonly trainingsRepository: TrainingsRepository) {}

  async findAll(
    currentUser: RequestUser,
    pagination: PaginationDto,
    filters: { employeeId?: string; search?: string; isActive?: boolean; status?: 'expired' | 'expiring' | 'valid' },
  ) {
    const scope = this.resolveScope(currentUser)
    const { items, total } = await this.trainingsRepository.findAll({
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

  async create(dto: CreateTrainingDto, currentUser: RequestUser) {
    const employee = await this.trainingsRepository.findEmployeeById(dto.employeeId)
    if (!employee) {
      throw new NotFoundException({
        error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Colaborador não encontrado', statusCode: 404 },
      })
    }
    this.assertCanAccessRecord(currentUser, employee.companyId, employee.unitId)

    const item = await this.trainingsRepository.create({
      tenantId: employee.tenantId,
      companyId: employee.companyId,
      unitId: employee.unitId,
      employeeId: employee.id,
      jobFunctionId: employee.jobFunctionId,
      name: dto.name,
      provider: dto.provider,
      workloadHours: dto.workloadHours,
      completedAt: dto.completedAt ? new Date(dto.completedAt) : null,
      dueDate: new Date(dto.dueDate),
      certificateUrl: dto.certificateUrl,
      status: dto.status as any,
      notes: dto.notes,
    })

    return { data: this.mapToEntity(item) }
  }

  async update(id: string, dto: UpdateTrainingDto, currentUser: RequestUser) {
    await this.findInUserScope(id, currentUser)
    const data: Record<string, any> = { ...dto }
    if (dto.completedAt !== undefined) data.completedAt = dto.completedAt ? new Date(dto.completedAt) : null
    if (dto.dueDate) data.dueDate = new Date(dto.dueDate)

    const updated = await this.trainingsRepository.update(id, data)
    return { data: this.mapToEntity(updated) }
  }

  async remove(id: string, currentUser: RequestUser) {
    await this.findInUserScope(id, currentUser)
    await this.trainingsRepository.softDelete(id, currentUser.userId)
  }

  private async findInUserScope(id: string, currentUser: RequestUser) {
    const scope = this.resolveScope(currentUser)
    const item = currentUser.role === Role.SUPER_ADMIN
      ? await this.trainingsRepository.findById(id)
      : await this.trainingsRepository.findByIdInScope(id, scope)

    if (!item) {
      throw new NotFoundException({
        error: { code: 'TRAINING_NOT_FOUND', message: 'Treinamento não encontrado', statusCode: 404 },
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
    if (!currentUser.permissions.includes(Permission.TRAININGS_WRITE)) {
      throw new ForbiddenException({
        error: { code: 'FORBIDDEN', message: 'Sem permissão para registrar treinamentos', statusCode: 403 },
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

  private mapToEntity(item: any): TrainingEntity {
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
      name: item.name,
      provider: item.provider,
      workloadHours: item.workloadHours,
      completedAt: item.completedAt,
      dueDate: item.dueDate,
      certificateUrl: item.certificateUrl,
      status: item.status,
      notes: item.notes,
      isExpired: dueDate < today,
      isExpiring: dueDate >= today && dueDate <= inThirtyDays,
      isActive: item.isActive,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }
  }
}
