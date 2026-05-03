import { Controller, Get, Query } from '@nestjs/common'
import { Permission, RequestUser } from '@moby/shared'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { ZodPipe } from '../../common/pipes/zod.pipe'
import { GetGroSummaryDto, GetGroSummarySchema } from './dto/get-gro-summary.dto'
import { GroService } from './gro.service'

@Controller('gro')
export class GroController {
  constructor(private readonly groService: GroService) {}

  @RequirePermissions(Permission.COMPANIES_READ)
  @Get('summary')
  getSummary(
    @CurrentUser() user: RequestUser,
    @Query(new ZodPipe(GetGroSummarySchema)) query: GetGroSummaryDto,
  ) {
    return this.groService.getSummary(user, query)
  }
}
