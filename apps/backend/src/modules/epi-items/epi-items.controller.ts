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
import { z } from 'zod'
import { EpiItemsService } from './epi-items.service'
import { CreateEpiItemSchema, CreateEpiItemDto } from './dto/create-epi-item.dto'
import { UpdateEpiItemSchema, UpdateEpiItemDto } from './dto/update-epi-item.dto'
import { ZodPipe } from '../../common/pipes/zod.pipe'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { RequestUser, Role, PaginationSchema, Permission } from '@moby/shared'

const EpiItemFilterSchema = PaginationSchema.extend({
  companyId: z.string().uuid().optional(),
  search:   z.string().optional(),
  isActive: z.coerce.boolean().optional(),
})

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('epi-items')
export class EpiItemsController {
  constructor(private readonly epiItemsService: EpiItemsService) {}

  @Roles(Role.ADMIN_SYSTEM, Role.TECH_SAFETY, Role.HR_ADMIN, Role.MANAGER)
  @RequirePermissions(Permission.EPI_READ)
  @Get()
  findAll(
    @CurrentUser() user: RequestUser,
    @Query(new ZodPipe(EpiItemFilterSchema)) query: any,
  ) {
    const { page, perPage, companyId, search, isActive } = query
    return this.epiItemsService.findAll(user, { page, perPage }, search, isActive, companyId)
  }

  @Roles(Role.ADMIN_SYSTEM, Role.TECH_SAFETY, Role.HR_ADMIN, Role.MANAGER)
  @RequirePermissions(Permission.EPI_READ)
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.epiItemsService.findOne(id, user)
  }

  @Roles(Role.ADMIN_SYSTEM, Role.TECH_SAFETY)
  @RequirePermissions(Permission.EPI_WRITE)
  @Post()
  create(
    @Body(new ZodPipe(CreateEpiItemSchema)) dto: CreateEpiItemDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.epiItemsService.create(dto, user)
  }

  @Roles(Role.ADMIN_SYSTEM, Role.TECH_SAFETY)
  @RequirePermissions(Permission.EPI_WRITE)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(UpdateEpiItemSchema)) dto: UpdateEpiItemDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.epiItemsService.update(id, dto, user)
  }

  @Roles(Role.ADMIN_SYSTEM, Role.TECH_SAFETY)
  @RequirePermissions(Permission.EPI_WRITE)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.epiItemsService.remove(id, user)
    return null
  }
}
