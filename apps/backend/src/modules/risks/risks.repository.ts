import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service'
import { Prisma } from '@prisma/client'

const riskInclude = {
  company: {
    select: {
      id: true,
      name: true,
      tradeName: true,
    },
  },
  unit: {
    select: {
      id: true,
      name: true,
    },
  },
  jobFunction: {
    select: {
      id: true,
      name: true,
    },
  },
}

@Injectable()
export class RisksRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: {
    tenantId?: string
    companyIds?: string[]
    unitIds?: string[]
    page: number
    perPage: number
    search?: string
    isActive?: boolean
    type?: string
    level?: string
  }) {
    const where: Prisma.RiskWhereInput = {
      deletedAt: null,
      ...(params.tenantId ? { tenantId: params.tenantId } : {}),
      ...(params.companyIds !== undefined ? { companyId: { in: params.companyIds } } : {}),
      ...(params.unitIds !== undefined ? { unitId: { in: params.unitIds } } : {}),
      ...(params.isActive === undefined ? {} : { isActive: params.isActive }),
      ...(params.type ? { type: params.type as any } : {}),
      ...(params.level ? { level: params.level as any } : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' } },
              { description: { contains: params.search, mode: 'insensitive' } },
              { controlMeasures: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    }

    const [items, total] = await Promise.all([
      this.prisma.risk.findMany({
        where,
        include: riskInclude,
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
        orderBy: [
          { isActive: 'desc' },
          { updatedAt: 'desc' },
        ],
      }),
      this.prisma.risk.count({ where }),
    ])

    return { items, total }
  }

  findById(id: string) {
    return this.prisma.risk.findFirst({
      where: { id, deletedAt: null },
      include: riskInclude,
    })
  }

  findUnitById(id: string) {
    return this.prisma.unit.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        tenantId: true,
        companyId: true,
        name: true,
        isActive: true,
      },
    })
  }

  findJobFunctionById(id: string) {
    return this.prisma.jobFunction.findFirst({
      where: { id, deletedAt: null },
      include: {
        functionUnits: {
          select: { unitId: true },
        },
      },
    })
  }

  create(data: {
    tenantId: string
    companyId: string
    unitId: string
    jobFunctionId?: string | null
    name: string
    type: string
    level: string
    probability: string
    severity: string
    description?: string
    controlMeasures?: string
  }) {
    return this.prisma.risk.create({
      data: {
        tenantId: data.tenantId,
        companyId: data.companyId,
        unitId: data.unitId,
        jobFunctionId: data.jobFunctionId ?? null,
        name: data.name,
        type: data.type as any,
        level: data.level as any,
        probability: data.probability as any,
        severity: data.severity as any,
        description: data.description,
        controlMeasures: data.controlMeasures,
      },
      include: riskInclude,
    })
  }

  update(
    id: string,
    data: {
      companyId?: string
      unitId?: string
      jobFunctionId?: string | null
      name?: string
      type?: string
      level?: string
      probability?: string
      severity?: string
      description?: string
      controlMeasures?: string
      isActive?: boolean
    },
  ) {
    return this.prisma.risk.update({
      where: { id },
      data: {
        companyId: data.companyId,
        unitId: data.unitId,
        jobFunctionId: data.jobFunctionId,
        name: data.name,
        type: data.type as any,
        level: data.level as any,
        probability: data.probability as any,
        severity: data.severity as any,
        description: data.description,
        controlMeasures: data.controlMeasures,
        isActive: data.isActive,
      },
      include: riskInclude,
    })
  }

  softDelete(id: string, deletedBy: string) {
    return this.prisma.risk.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy,
        isActive: false,
      },
      include: riskInclude,
    })
  }
}
