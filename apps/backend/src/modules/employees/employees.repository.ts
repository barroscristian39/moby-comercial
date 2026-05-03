import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { CreateEmployeeDto } from './dto/create-employee.dto'
import { UpdateEmployeeDto } from './dto/update-employee.dto'

type EmployeeScopeFilter = {
  tenantId?: string
  companyId?: string
  companyIds?: string[]
  unitId?: string
  unitIds?: string[]
}

@Injectable()
export class EmployeesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: EmployeeScopeFilter & {
    page: number,
    perPage: number,
    sectorId?: string
    jobFunctionId?: string
    search?: string
    isActive?: boolean
  }) {
    const where: Prisma.EmployeeWhereInput = {
      ...this.buildScopeWhere(params),
      deletedAt: null,
      ...(params.sectorId ? { sectorId: params.sectorId } : {}),
      ...(params.jobFunctionId ? { jobFunctionId: params.jobFunctionId } : {}),
      ...(params.isActive !== undefined ? { isActive: params.isActive } : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' } },
              { cpf: { contains: params.search } },
              { registration: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    }

    const [items, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
        orderBy: { name: 'asc' },
      }),
      this.prisma.employee.count({ where }),
    ])

    return { items, total }
  }

  async findById(id: string) {
    return this.prisma.employee.findFirst({ where: { id, deletedAt: null } })
  }

  async findByIdInScope(id: string, scope: EmployeeScopeFilter) {
    return this.prisma.employee.findFirst({
      where: {
        id,
        deletedAt: null,
        ...this.buildScopeWhere(scope),
      },
    })
  }

  async findByIdAndCompany(id: string, companyId: string) {
    return this.findByIdInScope(id, { companyId })
  }

  async findByCpfAndCompany(cpf: string, companyId: string) {
    return this.prisma.employee.findFirst({ where: { cpf, companyId, deletedAt: null } })
  }

  async findUnitById(id: string) {
    return this.prisma.unit.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        tenantId: true,
        companyId: true,
        isActive: true,
      },
    })
  }

  async findSectorById(id: string) {
    return this.prisma.sector.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        tenantId: true,
        companyId: true,
        unitId: true,
        isActive: true,
      },
    })
  }

  async findJobFunctionById(id: string) {
    return this.prisma.jobFunction.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        tenantId: true,
        companyId: true,
        unitId: true,
        status: true,
        isActive: true,
        functionUnits: {
          select: { unitId: true },
        },
      },
    })
  }

  async create(data: {
    tenantId?: string
    companyId: string
    unitId: string
    sectorId?: string
    jobFunctionId: string
    name: string
    cpf: string
    email?: string
    phone?: string
    birthDate?: Date
    gender?: string
    registration?: string
    admissionDate: Date
  }) {
    const company = await this.prisma.company.findFirst({
      where: { id: data.companyId, deletedAt: null },
      select: { tenantId: true },
    })
    return this.prisma.employee.create({ data: { ...data, tenantId: data.tenantId ?? company?.tenantId } as any })
  }

  async update(id: string, data: Record<string, any>) {
    return this.prisma.employee.update({ where: { id }, data })
  }

  async softDelete(id: string, deletedBy: string) {
    return this.prisma.employee.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy, isActive: false },
    })
  }

  private buildScopeWhere(scope: EmployeeScopeFilter): Prisma.EmployeeWhereInput {
    return {
      ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
      ...(scope.companyId
        ? { companyId: scope.companyId }
        : scope.companyIds !== undefined
          ? { companyId: { in: scope.companyIds } }
          : {}),
      ...(scope.unitId
        ? { unitId: scope.unitId }
        : scope.unitIds !== undefined
          ? { unitId: { in: scope.unitIds } }
          : {}),
    }
  }
}
