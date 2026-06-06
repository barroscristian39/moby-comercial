import { Injectable } from '@nestjs/common'
import { Prisma, RiskLevel as PrismaRiskLevel } from '@prisma/client'
import { RiskLevel } from '@moby/shared'
import { PrismaService } from '../../database/prisma.service'

type GroScope = {
  tenantId?: string
  companyIds?: string[]
  unitIds?: string[]
}

@Injectable()
export class GroRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(scope: GroScope) {
    const now = new Date()
    const riskWhere = this.buildRiskWhere(scope)
    const activeRiskWhere: Prisma.RiskWhereInput = { ...riskWhere, isActive: true }
    const activeEmployeeWhere = this.buildEmployeeWhere(scope)
    const activeUnitWhere = this.buildUnitWhere(scope)
    const activeEpiWhere = this.buildEpiWhere(scope)
    const withControlsWhere: Prisma.RiskWhereInput = {
      ...activeRiskWhere,
      AND: [
        { controlMeasures: { not: null } },
        { controlMeasures: { not: '' } },
      ],
    }
    const withoutControlsWhere: Prisma.RiskWhereInput = {
      ...activeRiskWhere,
      OR: [
        { controlMeasures: null },
        { controlMeasures: '' },
      ],
    }

    const [
      activeUnits,
      activeEmployees,
      activeRisks,
      criticalRisks,
      risksWithControls,
      risksWithoutControls,
      inactiveRisks,
      activeEpiItems,
      expiredCaItems,
      risksByLevel,
      risksByUnitRaw,
    ] = await Promise.all([
      this.prisma.unit.count({ where: activeUnitWhere }),
      this.prisma.employee.count({ where: activeEmployeeWhere }),
      this.prisma.risk.count({ where: activeRiskWhere }),
      this.prisma.risk.count({
        where: {
          ...activeRiskWhere,
          level: RiskLevel.CRITICAL,
        },
      }),
      this.prisma.risk.count({ where: withControlsWhere }),
      this.prisma.risk.count({ where: withoutControlsWhere }),
      this.prisma.risk.count({
        where: {
          ...riskWhere,
          isActive: false,
        },
      }),
      this.prisma.epiItem.count({ where: activeEpiWhere }),
      this.prisma.epiItem.count({
        where: {
          ...activeEpiWhere,
          caExpiry: { lt: now },
        },
      }),
      this.prisma.risk.groupBy({
        by: ['level'],
        where: activeRiskWhere,
        _count: { _all: true },
      }),
      this.prisma.risk.groupBy({
        by: ['unitId'],
        where: activeRiskWhere,
        _count: { _all: true },
      }),
    ])

    const unitIds = risksByUnitRaw.map((item) => item.unitId)
    const units = unitIds.length === 0
      ? []
      : await this.prisma.unit.findMany({
          where: { id: { in: unitIds } },
          select: { id: true, name: true },
        })

    const unitNameMap = new Map(units.map((unit) => [unit.id, unit.name]))
    const risksByUnit = risksByUnitRaw
      .map((item) => ({
        unitId: item.unitId,
        unitName: unitNameMap.get(item.unitId) ?? 'Unidade',
        count: item._count._all,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    return {
      kpis: {
        activeUnits,
        activeEmployees,
        activeRisks,
        criticalRisks,
        risksWithControls,
        risksWithoutControls,
        inactiveRisks,
        activeEpiItems,
        expiredCaItems,
      },
      risksByLevel: risksByLevel
        .map((item) => ({
          level: item.level as RiskLevel,
          count: item._count._all,
        }))
        .sort((a, b) => this.riskLevelOrder(a.level) - this.riskLevelOrder(b.level)),
      risksByUnit,
    }
  }

  private buildRiskWhere(scope: GroScope): Prisma.RiskWhereInput {
    return {
      deletedAt: null,
      ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
      ...(scope.companyIds !== undefined ? { companyId: { in: scope.companyIds } } : {}),
      ...(scope.unitIds !== undefined ? { unitId: { in: scope.unitIds } } : {}),
    }
  }

  private buildUnitWhere(scope: GroScope): Prisma.UnitWhereInput {
    return {
      deletedAt: null,
      isActive: true,
      ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
      ...(scope.companyIds !== undefined ? { companyId: { in: scope.companyIds } } : {}),
      ...(scope.unitIds !== undefined ? { id: { in: scope.unitIds } } : {}),
    }
  }

  private buildEmployeeWhere(scope: GroScope): Prisma.EmployeeWhereInput {
    return {
      deletedAt: null,
      isActive: true,
      ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
      ...(scope.companyIds !== undefined ? { companyId: { in: scope.companyIds } } : {}),
      ...(scope.unitIds !== undefined ? { unitId: { in: scope.unitIds } } : {}),
    }
  }

  private buildEpiWhere(scope: GroScope): Prisma.EpiItemWhereInput {
    return {
      deletedAt: null,
      isActive: true,
      ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
      ...(scope.companyIds !== undefined ? { companyId: { in: scope.companyIds } } : {}),
    }
  }

  private riskLevelOrder(level: RiskLevel | PrismaRiskLevel) {
    switch (level) {
      case RiskLevel.NEGLIGIBLE:
        return 0
      case RiskLevel.LOW:
        return 1
      case RiskLevel.MEDIUM:
        return 2
      case RiskLevel.HIGH:
        return 3
      case RiskLevel.CRITICAL:
        return 4
      default:
        return 99
    }
  }
}
