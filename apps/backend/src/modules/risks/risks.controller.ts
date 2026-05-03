import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common'
import { z } from 'zod'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { ManualAudit } from '../../common/decorators/manual-audit.decorator'
import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { ZodPipe } from '../../common/pipes/zod.pipe'
import { CreateRiskDto, CreateRiskSchema } from './dto/create-risk.dto'
import { UpdateRiskDto, UpdateRiskSchema } from './dto/update-risk.dto'
import { RisksService } from './risks.service'
import { PaginationSchema, Permission, RequestUser, RiskLevel, RiskType } from '@moby/shared'

const RiskQuerySchema = PaginationSchema.extend({
  tenantId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  unitId: z.string().uuid().optional(),
  search: z.string().trim().optional(),
  isActive: z.coerce.boolean().optional(),
  type: z.nativeEnum(RiskType).optional(),
  level: z.nativeEnum(RiskLevel).optional(),
})

@ManualAudit()
@Controller('risks')
export class RisksController {
  constructor(private readonly risksService: RisksService) {}

  @RequirePermissions(Permission.RISKS_READ)
  @Get()
  findAll(
    @CurrentUser() user: RequestUser,
    @Query(new ZodPipe(RiskQuerySchema)) query: z.infer<typeof RiskQuerySchema>,
  ) {
    const { page, perPage, tenantId, companyId, unitId, search, isActive, type, level } = query
    return this.risksService.findAll(
      user,
      { page, perPage },
      { tenantId, companyId, unitId, search, isActive, type, level },
    )
  }

  @RequirePermissions(Permission.RISKS_READ)
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.risksService.findOne(id, user)
  }

  @RequirePermissions(Permission.RISKS_WRITE)
  @Post()
  create(
    @Body(new ZodPipe(CreateRiskSchema)) dto: CreateRiskDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.risksService.create(dto, user)
  }

  @RequirePermissions(Permission.RISKS_WRITE)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(UpdateRiskSchema)) dto: UpdateRiskDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.risksService.update(id, dto, user)
  }

  @RequirePermissions(Permission.RISKS_WRITE)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.risksService.remove(id, user)
    return null
  }
}
