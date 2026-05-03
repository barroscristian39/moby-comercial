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
import {
  AccidentSeverity,
  AccidentStatus,
  AccidentType,
  PaginationSchema,
  Permission,
  RequestUser,
} from '@moby/shared'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { ManualAudit } from '../../common/decorators/manual-audit.decorator'
import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { ZodPipe } from '../../common/pipes/zod.pipe'
import { AccidentsService } from './accidents.service'
import { CreateAccidentDto, CreateAccidentSchema } from './dto/create-accident.dto'
import { UpdateAccidentDto, UpdateAccidentSchema } from './dto/update-accident.dto'

const AccidentQuerySchema = PaginationSchema.extend({
  tenantId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  unitId: z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
  search: z.string().trim().optional(),
  status: z.nativeEnum(AccidentStatus).optional(),
  severity: z.nativeEnum(AccidentSeverity).optional(),
  accidentType: z.nativeEnum(AccidentType).optional(),
  fromDate: z.string().trim().optional(),
  toDate: z.string().trim().optional(),
})

@ManualAudit()
@Controller('accidents')
export class AccidentsController {
  constructor(private readonly accidentsService: AccidentsService) {}

  @RequirePermissions(Permission.ACCIDENTS_READ)
  @Get()
  findAll(
    @CurrentUser() user: RequestUser,
    @Query(new ZodPipe(AccidentQuerySchema)) query: z.infer<typeof AccidentQuerySchema>,
  ) {
    const {
      page,
      perPage,
      tenantId,
      companyId,
      unitId,
      employeeId,
      search,
      status,
      severity,
      accidentType,
      fromDate,
      toDate,
    } = query

    return this.accidentsService.findAll(
      user,
      { page, perPage },
      { tenantId, companyId, unitId, employeeId, search, status, severity, accidentType, fromDate, toDate },
    )
  }

  @RequirePermissions(Permission.ACCIDENTS_READ)
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.accidentsService.findOne(id, user)
  }

  @RequirePermissions(Permission.ACCIDENTS_READ)
  @Get(':id/conclusion-report')
  getConclusionReport(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.accidentsService.getConclusionReport(id, user)
  }

  @RequirePermissions(Permission.ACCIDENTS_WRITE)
  @Post()
  create(
    @Body(new ZodPipe(CreateAccidentSchema)) dto: CreateAccidentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.accidentsService.create(dto, user)
  }

  @RequirePermissions(Permission.ACCIDENTS_WRITE)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(UpdateAccidentSchema)) dto: UpdateAccidentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.accidentsService.update(id, dto, user)
  }

  @RequirePermissions(Permission.ACCIDENTS_WRITE)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.accidentsService.remove(id, user)
    return null
  }
}
