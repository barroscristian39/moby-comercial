import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'

type TrainingScopeFilter = {
  tenantId?: string
  companyIds?: string[]
  unitIds?: string[]
}

const trainingInclude = {
  employee: { select: { id: true, name: true } },
  unit: { select: { id: true, name: true } },
  jobFunction: { select: { id: true, name: true } },
}

@Injectable()
export class TrainingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: TrainingScopeFilter & {
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

    const where: Prisma.TrainingWhereInput = {
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
              { employee: { name: { contains: params.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    }

    const [items, total] = await Promise.all([
      this.prisma.training.findMany({
        where,
        include: trainingInclude,
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
        orderBy: [{ dueDate: 'asc' }, { updatedAt: 'desc' }],
      }),
      this.prisma.training.count({ where }),
    ])

    return { items, total }
  }

  findById(id: string) {
    return this.prisma.training.findFirst({
      where: { id, deletedAt: null },
      include: trainingInclude,
    })
  }

  findByIdInScope(id: string, scope: TrainingScopeFilter) {
    return this.prisma.training.findFirst({
      where: { id, deletedAt: null, ...this.buildScopeWhere(scope) },
      include: trainingInclude,
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

  create(data: Prisma.TrainingUncheckedCreateInput) {
    return this.prisma.training.create({ data, include: trainingInclude })
  }

  update(id: string, data: Prisma.TrainingUncheckedUpdateInput) {
    return this.prisma.training.update({ where: { id }, data, include: trainingInclude })
  }

  softDelete(id: string, deletedBy: string) {
    return this.prisma.training.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy, isActive: false },
      include: trainingInclude,
    })
  }

  private buildScopeWhere(scope: TrainingScopeFilter): Prisma.TrainingWhereInput {
    return {
      ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
      ...(scope.companyIds !== undefined ? { companyId: { in: scope.companyIds } } : {}),
      ...(scope.unitIds !== undefined ? { unitId: { in: scope.unitIds } } : {}),
    }
  }
}
