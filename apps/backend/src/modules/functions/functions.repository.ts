import { Injectable } from '@nestjs/common'
import { Prisma, FunctionStatus } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { CreateFunctionDto } from './dto/create-function.dto'
import { UpdateFunctionDto } from './dto/update-function.dto'

const functionInclude = {
  functionUnits: {
    select: { unitId: true },
    orderBy: { createdAt: 'asc' as const },
  },
}

@Injectable()
export class FunctionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: {
    tenantId?: string
    companyIds?: string[]
    unitIds?: string[]
    page: number
    perPage: number
    search?: string
  }) {
    const where: Prisma.JobFunctionWhereInput = {
      deletedAt: null,
      ...(params.tenantId ? { tenantId: params.tenantId } : {}),
      ...(params.search ? { name: { contains: params.search, mode: 'insensitive' } } : {}),
      ...(params.companyIds !== undefined ? { companyId: { in: params.companyIds } } : {}),
      ...(params.unitIds !== undefined ? { functionUnits: { some: { unitId: { in: params.unitIds } } } } : {}),
    }

    const [items, total] = await Promise.all([
      this.prisma.jobFunction.findMany({
        where,
        include: functionInclude,
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
        orderBy: { name: 'asc' },
      }),
      this.prisma.jobFunction.count({ where }),
    ])

    return { items, total }
  }

  async findById(id: string) {
    return this.prisma.jobFunction.findFirst({
      where: { id, deletedAt: null },
      include: functionInclude,
    })
  }

  async findUnitsByIds(unitIds: string[]) {
    return this.prisma.unit.findMany({
      where: {
        id: { in: unitIds },
        deletedAt: null,
      },
      select: {
        id: true,
        tenantId: true,
        companyId: true,
        isActive: true,
      },
    })
  }

  async create(data: CreateFunctionDto & { tenantId: string; companyId: string }) {
    return this.prisma.$transaction(async (tx) => {
      const jobFunction = await tx.jobFunction.create({
        data: {
          tenantId: data.tenantId,
          companyId: data.companyId,
          name: data.name,
          cbo: data.cbo,
          description: data.description,
          status: data.status as FunctionStatus,
          isActive: data.status === 'ACTIVE',
        },
      })

      await tx.functionUnit.createMany({
        data: data.unitIds.map((unitId) => ({
          tenantId: data.tenantId,
          jobFunctionId: jobFunction.id,
          unitId,
        })),
        skipDuplicates: true,
      })

      return tx.jobFunction.findFirstOrThrow({
        where: { id: jobFunction.id },
        include: functionInclude,
      })
    })
  }

  async update(id: string, data: UpdateFunctionDto & { tenantId?: string; normalizedCompanyId?: string }) {
    return this.prisma.$transaction(async (tx) => {
      await tx.jobFunction.update({
        where: { id },
        data: {
          name: data.name,
          cbo: data.cbo,
          description: data.description,
          companyId: data.normalizedCompanyId,
          status: data.status as FunctionStatus | undefined,
          isActive: data.status ? data.status === 'ACTIVE' : undefined,
        },
      })

      if (data.unitIds) {
        await tx.functionUnit.deleteMany({ where: { jobFunctionId: id } })
        await tx.functionUnit.createMany({
          data: data.unitIds.map((unitId) => ({
            tenantId: data.tenantId!,
            jobFunctionId: id,
            unitId,
          })),
          skipDuplicates: true,
        })
      }

      return tx.jobFunction.findFirstOrThrow({
        where: { id },
        include: functionInclude,
      })
    })
  }

  async softDelete(id: string, deletedBy: string) {
    return this.prisma.jobFunction.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy,
        isActive: false,
        status: FunctionStatus.INACTIVE,
      },
    })
  }
}
