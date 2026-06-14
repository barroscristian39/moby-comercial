import { Injectable } from '@nestjs/common'
import { RequestUser, Role } from '@moby/shared'
import { AuthorizationService } from '../../common/authorization/authorization.service'
import { GetDashboardMetricsDto } from './dto/get-dashboard-metrics.dto'
import { DashboardMetricsEntity } from './entities/dashboard-metrics.entity'
import { DashboardRepository } from './dashboard.repository'

@Injectable()
export class DashboardService {
  constructor(
    private readonly dashboardRepository: DashboardRepository,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async getMetrics(
    currentUser: RequestUser,
    query: GetDashboardMetricsDto,
  ): Promise<{ data: DashboardMetricsEntity }> {
    const companyIds = this.authorizationService.resolveCompanyScope(currentUser, query.companyId)
    const unitIds = this.authorizationService.resolveUnitScope(currentUser, query.unitId)
    const tenantId = currentUser.role === Role.SUPER_ADMIN ? undefined : currentUser.tenantId ?? undefined

    const epiCompanyIds =
      unitIds !== undefined && unitIds.length > 0 && companyIds === undefined
        ? await this.dashboardRepository.listCompanyIdsForUnits(unitIds, tenantId)
        : companyIds

    const metrics = await this.dashboardRepository.getMetrics({
      tenantId,
      companyIds,
      unitIds,
      epiCompanyIds,
    })

    return {
      data: {
        companyId: query.companyId ?? null,
        unitId: query.unitId ?? null,
        activeUnits: metrics.activeUnits,
        employees: metrics.employees,
        reportsIssued: metrics.reportsIssued,
        supplementaryExams: metrics.supplementaryExams,
        supplementaryExamsAvailable: true,
        accidentsWithLeave: metrics.accidentsWithLeave,
        accidentsWithoutLeave: metrics.accidentsWithoutLeave,
        expiredEpis: metrics.expiredEpis,
        criticalRisks: metrics.criticalRisks,
      },
    }
  }
}
