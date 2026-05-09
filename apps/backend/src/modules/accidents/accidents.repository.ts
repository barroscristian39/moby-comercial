import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'

const accidentInclude = {
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
  employee: {
    select: {
      id: true,
      name: true,
      cpf: true,
      registration: true,
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
export class AccidentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: {
    tenantId?: string
    companyIds?: string[]
    unitIds?: string[]
    page: number
    perPage: number
    search?: string
    status?: string
    severity?: string
    accidentType?: string
    employeeId?: string
    fromDate?: Date
    toDate?: Date
  }) {
    const where: Prisma.AccidentWhereInput = {
      deletedAt: null,
      ...(params.tenantId ? { tenantId: params.tenantId } : {}),
      ...(params.companyIds?.length ? { companyId: { in: params.companyIds } } : {}),
      ...(params.unitIds?.length ? { unitId: { in: params.unitIds } } : {}),
      ...(params.status ? { status: params.status as any } : {}),
      ...(params.severity ? { severity: params.severity as any } : {}),
      ...(params.accidentType ? { accidentType: params.accidentType as any } : {}),
      ...(params.employeeId ? { employeeId: params.employeeId } : {}),
      ...(params.fromDate || params.toDate
        ? {
            occurredAt: {
              ...(params.fromDate ? { gte: params.fromDate } : {}),
              ...(params.toDate ? { lte: params.toDate } : {}),
            },
          }
        : {}),
      ...(params.search
        ? {
            OR: [
              { code: { contains: params.search, mode: 'insensitive' } },
              { location: { contains: params.search, mode: 'insensitive' } },
              { description: { contains: params.search, mode: 'insensitive' } },
              { employee: { name: { contains: params.search, mode: 'insensitive' } } },
              { jobFunction: { name: { contains: params.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    }

    const [items, total] = await Promise.all([
      this.prisma.accident.findMany({
        where,
        include: accidentInclude,
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
        orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.accident.count({ where }),
    ])

    return { items, total }
  }

  findById(id: string) {
    return this.prisma.accident.findFirst({
      where: { id, deletedAt: null },
      include: accidentInclude,
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
        name: true,
        cpf: true,
        registration: true,
        company: {
          select: {
            id: true,
            isActive: true,
          },
        },
        unit: {
          select: {
            id: true,
            isActive: true,
          },
        },
        jobFunction: {
          select: {
            id: true,
            isActive: true,
          },
        },
      },
    })
  }

  create(data: Prisma.AccidentUncheckedCreateInput) {
    return this.prisma.accident.create({
      data,
      include: accidentInclude,
    })
  }

  update(id: string, data: Prisma.AccidentUncheckedUpdateInput) {
    return this.prisma.accident.update({
      where: { id },
      data,
      include: accidentInclude,
    })
  }

  softDelete(id: string, deletedBy: string) {
    return this.prisma.accident.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy,
        isActive: false,
      },
      include: accidentInclude,
    })
  }

  findEvidenceById(id: string) {
    return this.prisma.accidentEvidence.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    })
  }

  findEvidencesByAccidentId(accidentId: string) {
    return this.prisma.accidentEvidence.findMany({
      where: {
        accidentId,
        deletedAt: null,
      },
      orderBy: [{ createdAt: 'desc' }],
    })
  }

  createEvidence(data: Prisma.AccidentEvidenceUncheckedCreateInput) {
    return this.prisma.accidentEvidence.create({ data })
  }

  softDeleteEvidence(id: string, deletedBy: string) {
    return this.prisma.accidentEvidence.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy,
        isActive: false,
      },
    })
  }
}
