import { ForbiddenException, Injectable } from '@nestjs/common'
import { RequestUser, Role } from '@moby/shared'
import { AuthorizationService } from '../../common/authorization/authorization.service'
import { GroRepository } from './gro.repository'
import { GetGroSummaryDto } from './dto/get-gro-summary.dto'
import { GroSummaryEntity } from './entities/gro-summary.entity'

@Injectable()
export class GroService {
  constructor(
    private readonly groRepository: GroRepository,
    private readonly authorizationService: AuthorizationService,
  ) {}

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
    return this.authorizationService.resolveCompanyScope(currentUser, requestedCompanyId)
  }

  private resolveUnitScope(currentUser: RequestUser, requestedUnitId?: string) {
    return this.authorizationService.resolveUnitScope(currentUser, requestedUnitId)
  }

  private deny(message: string): never {
    throw new ForbiddenException({
      error: { code: 'FORBIDDEN', message, statusCode: 403 },
    })
  }
}
