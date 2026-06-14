import { Injectable } from '@nestjs/common'
import { GeneratedDocumentStatus, OccupationalExamType, Prisma, RiskLevel, SstLegalDocumentStatus } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'

type DashboardScope = {
  tenantId?: string
  companyIds?: string[]
  unitIds?: string[]
  epiCompanyIds?: string[]
}

@Injectable()
export class DashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listCompanyIdsForUnits(unitIds: string[], tenantId?: string): Promise<string[]> {
    if (unitIds.length === 0) {
      return []
    }

    const units = await this.prisma.unit.findMany({
      where: {
        deletedAt: null,
        id: { in: unitIds },
        ...(tenantId ? { tenantId } : {}),
      },
      select: { companyId: true },
      distinct: ['companyId'],
    })

    return units.map((unit) => unit.companyId)
  }

  async getMetrics(scope: DashboardScope) {
    const now = new Date()
    const unitWhere = this.buildUnitWhere(scope)
    const employeeWhere = this.buildEmployeeWhere(scope)
    const riskWhere = this.buildRiskWhere(scope)
    const accidentWhere = this.buildAccidentWhere(scope)
    const generatedDocumentWhere = this.buildGeneratedDocumentWhere(scope)
    const accidentGeneratedDocumentWhere = this.buildAccidentGeneratedDocumentWhere(scope)
    const sstLegalDocumentWhere = this.buildSstLegalDocumentWhere(scope)
    const epiWhere = this.buildEpiWhere(scope)
    const occupationalExamWhere = this.buildOccupationalExamWhere(scope)

    const [
      activeUnits,
      employees,
      supplementaryExams,
      accidentsWithLeave,
      accidentsWithoutLeave,
      generatedDocuments,
      accidentGeneratedDocuments,
      sstLegalDocuments,
      expiredEpis,
      criticalRisks,
    ] = await Promise.all([
      this.prisma.unit.count({ where: unitWhere }),
      this.prisma.employee.count({ where: employeeWhere }),
      this.prisma.occupationalExam.count({
        where: {
          ...occupationalExamWhere,
          examType: OccupationalExamType.COMPLEMENTARY,
        },
      }),
      this.prisma.accident.count({
        where: {
          ...accidentWhere,
          leaveRequired: true,
        },
      }),
      this.prisma.accident.count({
        where: {
          ...accidentWhere,
          leaveRequired: false,
        },
      }),
      this.prisma.generatedDocument.count({ where: generatedDocumentWhere }),
      this.prisma.accidentGeneratedDocument.count({ where: accidentGeneratedDocumentWhere }),
      this.prisma.sstLegalDocument.count({ where: sstLegalDocumentWhere }),
      this.prisma.epiItem.count({
        where: {
          ...epiWhere,
          caExpiry: { lt: now },
        },
      }),
      this.prisma.risk.count({
        where: {
          ...riskWhere,
          level: RiskLevel.CRITICAL,
        },
      }),
    ])

    return {
      activeUnits,
      employees,
      supplementaryExams,
      supplementaryExamsAvailable: true,
      reportsIssued: generatedDocuments + accidentGeneratedDocuments + sstLegalDocuments,
      accidentsWithLeave,
      accidentsWithoutLeave,
      expiredEpis,
      criticalRisks,
    }
  }

  private buildUnitWhere(scope: DashboardScope): Prisma.UnitWhereInput {
    return {
      deletedAt: null,
      isActive: true,
      ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
      ...(scope.companyIds !== undefined ? { companyId: { in: scope.companyIds } } : {}),
      ...(scope.unitIds !== undefined ? { id: { in: scope.unitIds } } : {}),
    }
  }

  private buildEmployeeWhere(scope: DashboardScope): Prisma.EmployeeWhereInput {
    return {
      deletedAt: null,
      isActive: true,
      ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
      ...(scope.companyIds !== undefined ? { companyId: { in: scope.companyIds } } : {}),
      ...(scope.unitIds !== undefined ? { unitId: { in: scope.unitIds } } : {}),
    }
  }

  private buildRiskWhere(scope: DashboardScope): Prisma.RiskWhereInput {
    return {
      deletedAt: null,
      isActive: true,
      ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
      ...(scope.companyIds !== undefined ? { companyId: { in: scope.companyIds } } : {}),
      ...(scope.unitIds !== undefined ? { unitId: { in: scope.unitIds } } : {}),
    }
  }

  private buildAccidentWhere(scope: DashboardScope): Prisma.AccidentWhereInput {
    return {
      deletedAt: null,
      ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
      ...(scope.companyIds !== undefined ? { companyId: { in: scope.companyIds } } : {}),
      ...(scope.unitIds !== undefined ? { unitId: { in: scope.unitIds } } : {}),
    }
  }

  private buildGeneratedDocumentWhere(scope: DashboardScope): Prisma.GeneratedDocumentWhereInput {
    return {
      deletedAt: null,
      status: GeneratedDocumentStatus.ACTIVE,
      ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
      ...(scope.unitIds !== undefined ? { unitId: { in: scope.unitIds } } : {}),
      ...(scope.companyIds !== undefined
        ? {
            unit: {
              is: {
                companyId: { in: scope.companyIds },
              },
            },
          }
        : {}),
    }
  }

  private buildAccidentGeneratedDocumentWhere(
    scope: DashboardScope,
  ): Prisma.AccidentGeneratedDocumentWhereInput {
    return {
      deletedAt: null,
      status: GeneratedDocumentStatus.ACTIVE,
      ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
      ...(scope.companyIds !== undefined ? { companyId: { in: scope.companyIds } } : {}),
      ...(scope.unitIds !== undefined ? { unitId: { in: scope.unitIds } } : {}),
    }
  }

  private buildSstLegalDocumentWhere(scope: DashboardScope): Prisma.SstLegalDocumentWhereInput {
    return {
      deletedAt: null,
      status: SstLegalDocumentStatus.ACTIVE,
      ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
      ...(scope.companyIds !== undefined ? { companyId: { in: scope.companyIds } } : {}),
      ...(scope.unitIds !== undefined ? { OR: [{ unitId: null }, { unitId: { in: scope.unitIds } }] } : {}),
    }
  }

  private buildEpiWhere(scope: DashboardScope): Prisma.EpiItemWhereInput {
    const companyIds = scope.epiCompanyIds ?? scope.companyIds

    return {
      deletedAt: null,
      isActive: true,
      ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
      ...(companyIds !== undefined ? { companyId: { in: companyIds } } : {}),
    }
  }

  private buildOccupationalExamWhere(scope: DashboardScope): Prisma.OccupationalExamWhereInput {
    return {
      deletedAt: null,
      isActive: true,
      ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
      ...(scope.companyIds !== undefined ? { companyId: { in: scope.companyIds } } : {}),
      ...(scope.unitIds !== undefined ? { unitId: { in: scope.unitIds } } : {}),
    }
  }
}
