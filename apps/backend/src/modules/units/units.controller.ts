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
import { PaginationSchema, Permission, RequestUser } from '@moby/shared'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { ManualAudit } from '../../common/decorators/manual-audit.decorator'
import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { ZodPipe } from '../../common/pipes/zod.pipe'
import { CreateUnitDto, CreateUnitSchema } from './dto/create-unit.dto'
import { UpdateUnitDto, UpdateUnitSchema } from './dto/update-unit.dto'
import { UnitsService } from './units.service'

@ManualAudit()
@Controller('units')
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @RequirePermissions(Permission.UNITS_READ)
  @Get()
  findAll(
    @CurrentUser() user: RequestUser,
    @Query(new ZodPipe(PaginationSchema)) pagination: any,
    @Query('search') search?: string,
    @Query('companyId') companyId?: string,
  ) {
    return this.unitsService.findAll(user, pagination, search, companyId)
  }

  @RequirePermissions(Permission.UNITS_READ)
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.unitsService.findOne(id, user)
  }

  @RequirePermissions(Permission.UNITS_WRITE)
  @Post()
  create(
    @Body(new ZodPipe(CreateUnitSchema)) dto: CreateUnitDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.unitsService.create(dto, user)
  }

  @RequirePermissions(Permission.UNITS_WRITE)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(UpdateUnitSchema)) dto: UpdateUnitDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.unitsService.update(id, dto, user)
  }

  @RequirePermissions(Permission.UNITS_WRITE)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.unitsService.remove(id, user)
    return null
  }
}
