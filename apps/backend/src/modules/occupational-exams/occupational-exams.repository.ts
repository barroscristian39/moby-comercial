import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'

type ExamScopeFilter = {
  tenantId?: string
  companyIds?: string[]
  unitIds?: string[]
}

const examInclude = {
  employee: { select: { id: true, name: true } },
  unit: { select: { id: true, name: true } },
  jobFunction: { select: { id: true, name: true } },
}

@Injectable()
export class OccupationalExamsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: ExamScopeFilter & {
    page: number
    perPage: number
    employeeId?: string
    search?: string
    isActive?: boolean
    status?: 'expired' | 'expiring' | 'valid'
  }) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const inThirtyDays = new Date(today)
    inThirtyDays.setDate(inThirtyDays.getDate() + 30)

    const where: Prisma.OccupationalExamWhereInput = {
      ...this.buildScopeWhere(params),
      deletedAt: null,
      ...(params.employeeId ? { employeeId: params.employeeId } : {}),
      ...(params.isActive !== undefined ? { isActive: params.isActive } : {}),
      ...(params.status === 'expired' ? { dueDate: { lt: today } } : {}),
      ...(params.status === 'expiring' ? { dueDate: { gte: today, lte: inThirtyDays } } : {}),
      ...(params.status === 'valid' ? { dueDate: { gt: inThirtyDays } } : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' } },
              { provider: { contains: params.search, mode: 'insensitive' } },
              { asoNumber: { contains: params.search, mode: 'insensitive' } },
              { employee: { name: { contains: params.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    }

    const [items, total] = await Promise.all([
      this.prisma.occupationalExam.findMany({
        where,
        include: examInclude,
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
        orderBy: [{ dueDate: 'asc' }, { updatedAt: 'desc' }],
      }),
      this.prisma.occupationalExam.count({ where }),
    ])

    return { items, total }
  }

  findById(id: string) {
    return this.prisma.occupationalExam.findFirst({
      where: { id, deletedAt: null },
      include: examInclude,
    })
  }

  findByIdInScope(id: string, scope: ExamScopeFilter) {
    return this.prisma.occupationalExam.findFirst({
      where: { id, deletedAt: null, ...this.buildScopeWhere(scope) },
      include: examInclude,
    })
  }

  findEmployeeById(id: string) {
    return this.prisma.employee.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        tenantId: true,
        companyId: true,
        unitId: true,
        jobFunctionId: true,
        isActive: true,
      },
    })
  }

  create(data: Prisma.OccupationalExamUncheckedCreateInput) {
    return this.prisma.occupationalExam.create({ data, include: examInclude })
  }

  update(id: string, data: Prisma.OccupationalExamUncheckedUpdateInput) {
    return this.prisma.occupationalExam.update({ where: { id }, data, include: examInclude })
  }

  softDelete(id: string, deletedBy: string) {
    return this.prisma.occupationalExam.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy, isActive: false },
      include: examInclude,
    })
  }

  private buildScopeWhere(scope: ExamScopeFilter): Prisma.OccupationalExamWhereInput {
    return {
      ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
      ...(scope.companyIds !== undefined ? { companyId: { in: scope.companyIds } } : {}),
      ...(scope.unitIds !== undefined ? { unitId: { in: scope.unitIds } } : {}),
    }
  }
}
