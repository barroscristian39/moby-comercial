import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common'
import { SectorsService } from './sectors.service'
import { CreateSectorSchema, CreateSectorDto } from './dto/create-sector.dto'
import { UpdateSectorSchema, UpdateSectorDto } from './dto/update-sector.dto'
import { ZodPipe } from '../../common/pipes/zod.pipe'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { RequestUser, Role, PaginationSchema, Permission } from '@moby/shared'

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sectors')
export class SectorsController {
  constructor(private readonly sectorsService: SectorsService) {}

  @Roles(Role.ADMIN_SYSTEM, Role.TECH_SAFETY, Role.HR_ADMIN, Role.MANAGER)
  @RequirePermissions(Permission.UNITS_READ)
  @Get()
  findAll(
    @CurrentUser() user: RequestUser,
    @Query(new ZodPipe(PaginationSchema)) pagination: any,
    @Query('unitId') unitId?: string,
    @Query('search') search?: string,
    @Query('companyId') companyId?: string,
  ) {
    return this.sectorsService.findAll(user, pagination, unitId, search, companyId)
  }

  @Roles(Role.ADMIN_SYSTEM, Role.TECH_SAFETY, Role.HR_ADMIN, Role.MANAGER)
  @RequirePermissions(Permission.UNITS_READ)
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.sectorsService.findOne(id, user)
  }

  @Roles(Role.ADMIN_SYSTEM, Role.HR_ADMIN, Role.TECH_SAFETY)
  @RequirePermissions(Permission.UNITS_WRITE)
  @Post()
  create(
    @Body(new ZodPipe(CreateSectorSchema)) dto: CreateSectorDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.sectorsService.create(dto, user)
  }

  @Roles(Role.ADMIN_SYSTEM, Role.HR_ADMIN, Role.TECH_SAFETY)
  @RequirePermissions(Permission.UNITS_WRITE)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(UpdateSectorSchema)) dto: UpdateSectorDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.sectorsService.update(id, dto, user)
  }

  @Roles(Role.ADMIN_SYSTEM, Role.HR_ADMIN)
  @RequirePermissions(Permission.UNITS_WRITE)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.sectorsService.remove(id, user)
    return null
  }
}
