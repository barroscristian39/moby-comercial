import { Injectable } from '@nestjs/common'
import { Prisma, SstLegalDocumentStatus, SstLegalDocumentType } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'

type LegalDocumentScope = {
  tenantId?: string
  companyIds?: string[]
  unitIds?: string[]
}

const legalDocumentInclude = {
  company: { select: { id: true, name: true, tradeName: true, cnpj: true } },
  unit: { select: { id: true, name: true } },
  generator: { select: { id: true, name: true } },
}

@Injectable()
export class SstLegalDocumentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: LegalDocumentScope & {
    page: number
    perPage: number
    companyId?: string
    unitId?: string
    documentType?: string
    status?: string
    search?: string
  }) {
    const where: Prisma.SstLegalDocumentWhereInput = {
      deletedAt: null,
      ...this.buildScopeWhere(params),
      ...(params.companyId ? { companyId: params.companyId } : {}),
      ...(params.unitId ? { unitId: params.unitId } : {}),
      ...(params.documentType ? { documentType: params.documentType as SstLegalDocumentType } : {}),
      ...(params.status ? { status: params.status as SstLegalDocumentStatus } : {}),
      ...(params.search
        ? {
            OR: [
              { title: { contains: params.search, mode: 'insensitive' } },
              { summary: { contains: params.search, mode: 'insensitive' } },
              { company: { name: { contains: params.search, mode: 'insensitive' } } },
              { company: { tradeName: { contains: params.search, mode: 'insensitive' } } },
              { unit: { name: { contains: params.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    }

    const [items, total] = await Promise.all([
      this.prisma.sstLegalDocument.findMany({
        where,
        include: legalDocumentInclude,
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
        orderBy: [{ generatedAt: 'desc' }, { version: 'desc' }],
      }),
      this.prisma.sstLegalDocument.count({ where }),
    ])

    return { items, total }
  }

  findById(id: string) {
    return this.prisma.sstLegalDocument.findFirst({
      where: { id, deletedAt: null },
      include: legalDocumentInclude,
    })
  }

  findByIdInScope(id: string, scope: LegalDocumentScope) {
    return this.prisma.sstLegalDocument.findFirst({
      where: { id, deletedAt: null, ...this.buildScopeWhere(scope) },
      include: legalDocumentInclude,
    })
  }

  findCompanyById(id: string) {
    return this.prisma.company.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        tenantId: true,
        name: true,
        tradeName: true,
        cnpj: true,
        cnae: true,
        addressCity: true,
        addressState: true,
        isActive: true,
      },
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
        cnpj: true,
        addressCity: true,
        addressState: true,
        isActive: true,
      },
    })
  }

  async maxVersion(companyId: string, unitId: string | null, documentType: SstLegalDocumentType) {
    const result = await this.prisma.sstLegalDocument.aggregate({
      where: {
        companyId,
        unitId,
        documentType,
      },
      _max: { version: true },
    })

    return result._max.version ?? 0
  }

  async supersedeActive(companyId: string, unitId: string | null, documentType: SstLegalDocumentType) {
    return this.prisma.sstLegalDocument.updateMany({
      where: {
        companyId,
        unitId,
        documentType,
        status: SstLegalDocumentStatus.ACTIVE,
        deletedAt: null,
      },
      data: { status: SstLegalDocumentStatus.SUPERSEDED },
    })
  }

  create(data: Prisma.SstLegalDocumentUncheckedCreateInput) {
    return this.prisma.sstLegalDocument.create({
      data,
      include: legalDocumentInclude,
    })
  }

  async getEmissionStats(params: { companyId: string; unitId?: string }) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const scope = {
      companyId: params.companyId,
      ...(params.unitId ? { unitId: params.unitId } : {}),
    }

    const [
      employees,
      activeRisks,
      criticalRisks,
      activeEpiItems,
      expiredEpiItems,
      examsDue,
      trainingsDue,
      risksByType,
      risksByLevel,
    ] = await Promise.all([
      this.prisma.employee.count({ where: { ...scope, deletedAt: null, isActive: true } }),
      this.prisma.risk.count({ where: { ...scope, deletedAt: null, isActive: true } }),
      this.prisma.risk.count({ where: { ...scope, deletedAt: null, isActive: true, level: 'CRITICAL' } }),
      this.prisma.epiItem.count({ where: { companyId: params.companyId, deletedAt: null, isActive: true } }),
      this.prisma.epiItem.count({
        where: { companyId: params.companyId, deletedAt: null, isActive: true, caExpiry: { lt: today } },
      }),
      this.prisma.occupationalExam.count({ where: { ...scope, deletedAt: null, isActive: true, dueDate: { lt: today } } }),
      this.prisma.training.count({ where: { ...scope, deletedAt: null, isActive: true, dueDate: { lt: today } } }),
      this.prisma.risk.groupBy({
        by: ['type'],
        where: { ...scope, deletedAt: null, isActive: true },
        _count: { _all: true },
      }),
      this.prisma.risk.groupBy({
        by: ['level'],
        where: { ...scope, deletedAt: null, isActive: true },
        _count: { _all: true },
      }),
    ])

    return {
      employees,
      activeRisks,
      criticalRisks,
      activeEpiItems,
      expiredEpiItems,
      examsDue,
      trainingsDue,
      risksByType: risksByType.map((item) => ({ key: item.type, count: item._count._all })),
      risksByLevel: risksByLevel.map((item) => ({ key: item.level, count: item._count._all })),
    }
  }

  private buildScopeWhere(scope: LegalDocumentScope): Prisma.SstLegalDocumentWhereInput {
    return {
      ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
      ...(scope.companyIds !== undefined ? { companyId: { in: scope.companyIds } } : {}),
      ...(scope.unitIds !== undefined ? { OR: [{ unitId: null }, { unitId: { in: scope.unitIds } }] } : {}),
    }
  }
}
