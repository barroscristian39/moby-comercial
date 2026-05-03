import { ForbiddenException, Injectable } from '@nestjs/common'
import { RequestUser, Role } from '@moby/shared'
import { GroRepository } from './gro.repository'
import { GetGroSummaryDto } from './dto/get-gro-summary.dto'
import { GroSummaryEntity } from './entities/gro-summary.entity'

@Injectable()
export class GroService {
  constructor(private readonly groRepository: GroRepository) {}

  async getSummary(currentUser: RequestUser, query: GetGroSummaryDto): Promise<{ data: GroSummaryEntity }> {
    const companyIds = this.resolveCompanyScope(currentUser, query.companyId)
    const unitIds = this.resolveUnitScope(currentUser, query.unitId)
    const tenantId = currentUser.role === Role.SUPER_ADMIN ? undefined : currentUser.tenantId ?? undefined

    const summary = await this.groRepository.getSummary({
      tenantId,
      companyIds,
      unitIds,
    })

    const totalTrackedRisks = summary.kpis.activeRisks + summary.kpis.inactiveRisks
    const percentageOf = (value: number) => {
      if (totalTrackedRisks === 0) return 0
      return Number(((value / totalTrackedRisks) * 100).toFixed(1))
    }

    return {
      data: {
        companyId: query.companyId ?? null,
        unitId: query.unitId ?? null,
        kpis: summary.kpis,
        controlStatus: [
          {
            key: 'WITH_CONTROLS',
            label: 'Com medidas definidas',
            count: summary.kpis.risksWithControls,
            percentage: percentageOf(summary.kpis.risksWithControls),
          },
          {
            key: 'WITHOUT_CONTROLS',
            label: 'Sem medidas definidas',
            count: summary.kpis.risksWithoutControls,
            percentage: percentageOf(summary.kpis.risksWithoutControls),
          },
          {
            key: 'CRITICAL',
            label: 'Riscos críticos',
            count: summary.kpis.criticalRisks,
            percentage: percentageOf(summary.kpis.criticalRisks),
          },
          {
            key: 'INACTIVE',
            label: 'Riscos inativos',
            count: summary.kpis.inactiveRisks,
            percentage: percentageOf(summary.kpis.inactiveRisks),
          },
        ],
        risksByLevel: summary.risksByLevel,
        risksByUnit: summary.risksByUnit,
      },
    }
  }

  private resolveCompanyScope(currentUser: RequestUser, requestedCompanyId?: string) {
    if (currentUser.role === Role.SUPER_ADMIN || currentUser.role === Role.TENANT_ADMIN) {
      return requestedCompanyId ? [requestedCompanyId] : undefined
    }

    const allowedCompanyIds = currentUser.companyIds?.length
      ? currentUser.companyIds
      : currentUser.companyId
        ? [currentUser.companyId]
        : []

    if (requestedCompanyId) {
      if (!allowedCompanyIds.includes(requestedCompanyId)) {
        this.deny('Empresa fora do escopo permitido')
      }
      return [requestedCompanyId]
    }

    return allowedCompanyIds.length ? allowedCompanyIds : undefined
  }

  private resolveUnitScope(currentUser: RequestUser, requestedUnitId?: string) {
    if (currentUser.role === Role.SUPER_ADMIN || currentUser.role === Role.TENANT_ADMIN) {
      return requestedUnitId ? [requestedUnitId] : undefined
    }

    const allowedUnitIds = currentUser.unitIds ?? []
    if (requestedUnitId) {
      if (!allowedUnitIds.includes(requestedUnitId)) {
        this.deny('Unidade fora do escopo permitido')
      }
      return [requestedUnitId]
    }

    return allowedUnitIds.length ? allowedUnitIds : undefined
  }

  private deny(message: string): never {
    throw new ForbiddenException({
      error: { code: 'FORBIDDEN', message, statusCode: 403 },
    })
  }
}
