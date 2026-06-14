import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common'
import { EmployeesRepository } from './employees.repository'
import { CreateEmployeeDto } from './dto/create-employee.dto'
import { UpdateEmployeeDto } from './dto/update-employee.dto'
import { EmployeeEntity } from './entities/employee.entity'
import { EmployeeListEntity } from './entities/employee-list.entity'
import { RequestUser, Role, PaginationDto } from '@moby/shared'

type EmployeeAccessScope = {
  tenantId?: string
  companyId?: string
  companyIds?: string[]
  unitId?: string
  unitIds?: string[]
}

@Injectable()
export class EmployeesService {
  constructor(private readonly employeesRepository: EmployeesRepository) {}

  async findAll(
    currentUser: RequestUser,
    pagination: PaginationDto,
    unitId?: string,
    sectorId?: string,
    jobFunctionId?: string,
    search?: string,
    isActive?: boolean,
    requestedCompanyId?: string,
  ) {
    const scope = this.resolveAccessScope(currentUser, {
      companyId: requestedCompanyId,
      unitId,
    })

    const { items, total } = await this.employeesRepository.findAll(
      {
        ...scope,
        page: pagination.page,
        perPage: pagination.perPage,
        sectorId,
        jobFunctionId,
        search,
        isActive,
      },
    )

    return {
      data: items.map((employee) => this.mapToListEntity(employee)),
      meta: {
        total,
        page: pagination.page,
        perPage: pagination.perPage,
        totalPages: Math.ceil(total / pagination.perPage),
      },
    }
  }

  async findOne(id: string, currentUser: RequestUser): Promise<{ data: EmployeeEntity }> {
    const employee = await this.employeesRepository.findByIdInScope(
      id,
      this.resolveAccessScope(currentUser),
    )

    if (!employee) {
      throw new NotFoundException({
        error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Colaborador não encontrado', statusCode: 404 },
      })
    }

    return { data: this.mapToEntity(employee) }
  }

  async create(dto: CreateEmployeeDto, currentUser: RequestUser): Promise<{ data: EmployeeEntity }> {
    this.assertCompanyWritable(currentUser, dto.companyId)
    this.assertUnitWritable(currentUser, dto.unitId)

    const assignment = await this.validateAssignment({
      companyId: dto.companyId,
      unitId: dto.unitId,
      sectorId: dto.sectorId,
      jobFunctionId: dto.jobFunctionId,
    })

    if (currentUser.role !== Role.ADMIN_SYSTEM && assignment.tenantId !== currentUser.tenantId) {
      throw new ForbiddenException({
        error: { code: 'FORBIDDEN', message: 'Só é possível cadastrar colaboradores na sua empresa', statusCode: 403 },
      })
    }

    const existing = await this.employeesRepository.findByCpfAndCompany(dto.cpf, dto.companyId)
    if (existing) {
      throw new ConflictException({
        error: { code: 'CPF_CONFLICT', message: 'CPF já cadastrado nesta empresa', statusCode: 409 },
      })
    }

    const employee = await this.employeesRepository.create({
      tenantId: assignment.tenantId,
      companyId: dto.companyId,
      unitId: dto.unitId,
      sectorId: dto.sectorId,
      jobFunctionId: dto.jobFunctionId,
      name: dto.name,
      cpf: dto.cpf,
      email: dto.email,
      phone: dto.phone,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      gender: dto.gender,
      registration: dto.registration,
      admissionDate: new Date(dto.admissionDate),
    })

    return { data: this.mapToEntity(employee) }
  }

  async update(id: string, dto: UpdateEmployeeDto, currentUser: RequestUser): Promise<{ data: EmployeeEntity }> {
    const employee = await this.employeesRepository.findByIdInScope(
      id,
      this.resolveAccessScope(currentUser),
    )

    if (!employee) {
      throw new NotFoundException({
        error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Colaborador não encontrado', statusCode: 404 },
      })
    }

    await this.validateAssignment({
      companyId: employee.companyId,
      unitId: dto.unitId ?? employee.unitId,
      sectorId: dto.sectorId ?? employee.sectorId ?? undefined,
      jobFunctionId: dto.jobFunctionId ?? employee.jobFunctionId,
    })
    this.assertUnitWritable(currentUser, dto.unitId ?? employee.unitId)

    const updateData: Record<string, any> = { ...dto }
    if (dto.birthDate) updateData.birthDate = new Date(dto.birthDate)
    if (dto.admissionDate) updateData.admissionDate = new Date(dto.admissionDate)
    if (dto.dismissalDate) updateData.dismissalDate = new Date(dto.dismissalDate)

    const updated = await this.employeesRepository.update(id, updateData)
    return { data: this.mapToEntity(updated) }
  }

  async remove(id: string, currentUser: RequestUser): Promise<void> {
    const employee = await this.employeesRepository.findByIdInScope(
      id,
      this.resolveAccessScope(currentUser),
    )

    if (!employee) {
      throw new NotFoundException({
        error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Colaborador não encontrado', statusCode: 404 },
      })
    }

    await this.employeesRepository.softDelete(id, currentUser.userId)
  }

  private resolveAccessScope(
    currentUser: RequestUser,
    requested: { companyId?: string; unitId?: string } = {},
  ): EmployeeAccessScope {
    if (currentUser.role === Role.SUPER_ADMIN) {
      return {
        companyId: requested.companyId,
        unitId: requested.unitId,
      }
    }

    if (!currentUser.tenantId) {
      throw new ForbiddenException({
        error: { code: 'FORBIDDEN', message: 'Usuário sem ambiente associado', statusCode: 403 },
      })
    }

    const companyIds = Array.from(new Set([
      ...(currentUser.companyIds ?? []),
      ...(currentUser.companyId ? [currentUser.companyId] : []),
    ]))
    const unitIds = currentUser.unitIds ?? []

    if (requested.companyId && companyIds.length > 0 && !companyIds.includes(requested.companyId)) {
      throw new ForbiddenException({
        error: { code: 'FORBIDDEN', message: 'Empresa fora do escopo permitido', statusCode: 403 },
      })
    }

    if (requested.unitId && unitIds.length > 0 && !unitIds.includes(requested.unitId)) {
      throw new ForbiddenException({
        error: { code: 'FORBIDDEN', message: 'Unidade fora do escopo permitido', statusCode: 403 },
      })
    }

    const scope: EmployeeAccessScope = {
      ...(requested.companyId ? {} : { tenantId: currentUser.tenantId }),
      ...(requested.companyId
        ? { companyId: requested.companyId }
        : companyIds.length > 0
          ? { companyIds }
          : {}),
    }

    if (requested.unitId) {
      scope.unitId = requested.unitId
    } else if (currentUser.role !== Role.TENANT_ADMIN && unitIds.length > 0) {
      scope.unitIds = unitIds
    }

    return scope
  }

  private assertCompanyWritable(currentUser: RequestUser, companyId: string) {
    if (currentUser.role === Role.SUPER_ADMIN) return
    if (currentUser.role === Role.TENANT_ADMIN) {
      if (!currentUser.tenantId) {
        throw new ForbiddenException({
          error: { code: 'FORBIDDEN', message: 'Usuário sem ambiente associado', statusCode: 403 },
        })
      }
      return
    }

    const companyIds = Array.from(new Set([
      ...(currentUser.companyIds ?? []),
      ...(currentUser.companyId ? [currentUser.companyId] : []),
    ]))

    if (companyIds.length > 0 && !companyIds.includes(companyId)) {
      throw new ForbiddenException({
        error: { code: 'FORBIDDEN', message: 'Empresa fora do escopo permitido', statusCode: 403 },
      })
    }
  }

  private assertUnitWritable(currentUser: RequestUser, unitId: string) {
    if (currentUser.role === Role.SUPER_ADMIN || currentUser.role === Role.TENANT_ADMIN) return

    const unitIds = currentUser.unitIds ?? []
    if (unitIds.length > 0 && !unitIds.includes(unitId)) {
      throw new ForbiddenException({
        error: { code: 'FORBIDDEN', message: 'Unidade fora do escopo permitido', statusCode: 403 },
      })
    }
  }

  private async validateAssignment(input: {
    companyId: string
    unitId: string
    sectorId?: string
    jobFunctionId: string
  }): Promise<{ tenantId: string }> {
    const unit = await this.employeesRepository.findUnitById(input.unitId)
    if (!unit) {
      throw new NotFoundException({
        error: { code: 'UNIT_NOT_FOUND', message: 'Unidade não encontrada', statusCode: 404 },
      })
    }
    if (!unit.isActive || unit.companyId !== input.companyId) {
      throw new ForbiddenException({
        error: { code: 'INVALID_EMPLOYEE_SCOPE', message: 'Unidade não pertence à empresa informada ou está inativa', statusCode: 403 },
      })
    }

    const jobFunction = await this.employeesRepository.findJobFunctionById(input.jobFunctionId)
    if (!jobFunction) {
      throw new NotFoundException({
        error: { code: 'FUNCTION_NOT_FOUND', message: 'Função não encontrada', statusCode: 404 },
      })
    }
    const linkedUnitIds = jobFunction.functionUnits?.map((link: any) => link.unitId) ?? []
    const isLinkedToUnit = linkedUnitIds.includes(input.unitId) || jobFunction.unitId === input.unitId
    if (
      !jobFunction.isActive ||
      jobFunction.status !== 'ACTIVE' ||
      jobFunction.tenantId !== unit.tenantId ||
      jobFunction.companyId !== input.companyId ||
      !isLinkedToUnit
    ) {
      throw new ForbiddenException({
        error: {
          code: 'INVALID_EMPLOYEE_SCOPE',
          message: 'Função não pertence à unidade/empresa informada ou está inativa',
          statusCode: 403,
        },
      })
    }

    if (input.sectorId) {
      const sector = await this.employeesRepository.findSectorById(input.sectorId)
      if (!sector) {
        throw new NotFoundException({
          error: { code: 'SECTOR_NOT_FOUND', message: 'Setor não encontrado', statusCode: 404 },
        })
      }
      if (
        !sector.isActive ||
        sector.tenantId !== unit.tenantId ||
        sector.companyId !== input.companyId ||
        sector.unitId !== input.unitId
      ) {
        throw new ForbiddenException({
          error: {
            code: 'INVALID_EMPLOYEE_SCOPE',
            message: 'Setor não pertence à unidade/empresa informada ou está inativo',
            statusCode: 403,
          },
        })
      }
    }

    return { tenantId: unit.tenantId }
  }

  private mapToEntity(employee: any): EmployeeEntity {
    return {
      id: employee.id,
      companyId: employee.companyId,
      unitId: employee.unitId,
      sectorId: employee.sectorId,
      jobFunctionId: employee.jobFunctionId,
      name: employee.name,
      cpf: employee.cpf,
      email: employee.email,
      phone: employee.phone,
      birthDate: employee.birthDate,
      gender: employee.gender,
      registration: employee.registration,
      admissionDate: employee.admissionDate,
      dismissalDate: employee.dismissalDate,
      isActive: employee.isActive,
      createdAt: employee.createdAt,
      updatedAt: employee.updatedAt,
    }
  }

  private mapToListEntity(employee: any): EmployeeListEntity {
    return {
      id: employee.id,
      companyId: employee.companyId,
      unitId: employee.unitId,
      sectorId: employee.sectorId,
      jobFunctionId: employee.jobFunctionId,
      name: employee.name,
      cpfMasked: this.maskCpf(employee.cpf),
      registration: employee.registration,
      admissionDate: employee.admissionDate,
      dismissalDate: employee.dismissalDate,
      isActive: employee.isActive,
      createdAt: employee.createdAt,
      updatedAt: employee.updatedAt,
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
}
