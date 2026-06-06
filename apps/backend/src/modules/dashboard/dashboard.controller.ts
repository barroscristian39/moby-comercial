import { Controller, Get, Query } from '@nestjs/common'
import { RequestUser } from '@moby/shared'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { ZodPipe } from '../../common/pipes/zod.pipe'
import { GetDashboardMetricsDto, GetDashboardMetricsSchema } from './dto/get-dashboard-metrics.dto'
import { DashboardService } from './dashboard.service'

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('metrics')
  getMetrics(
    @CurrentUser() user: RequestUser,
    @Query(new ZodPipe(GetDashboardMetricsSchema)) query: GetDashboardMetricsDto,
  ) {
    return this.dashboardService.getMetrics(user, query)
  }
}
