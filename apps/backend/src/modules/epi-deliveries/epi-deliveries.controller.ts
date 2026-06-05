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
import { EpiDeliveriesService } from './epi-deliveries.service'
import { CreateEpiDeliverySchema, CreateEpiDeliveryDto } from './dto/create-epi-delivery.dto'
import { UpdateEpiDeliverySchema, UpdateEpiDeliveryDto } from './dto/update-epi-delivery.dto'
import { ZodPipe } from '../../common/pipes/zod.pipe'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { RequestUser, Role, PaginationSchema, Permission } from '@moby/shared'

const EpiDeliveryFilterSchema = PaginationSchema.extend({
  companyId:   z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
  epiItemId:  z.string().uuid().optional(),
})

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('epi-deliveries')
export class EpiDeliveriesController {
  constructor(private readonly epiDeliveriesService: EpiDeliveriesService) {}

  @Roles(Role.ADMIN_SYSTEM, Role.TECH_SAFETY, Role.HR_ADMIN, Role.MANAGER)
  @RequirePermissions(Permission.EPI_READ)
  @Get()
  findAll(
    @CurrentUser() user: RequestUser,
    @Query(new ZodPipe(EpiDeliveryFilterSchema)) query: any,
  ) {
    const { page, perPage, companyId, employeeId, epiItemId } = query
    return this.epiDeliveriesService.findAll(user, { page, perPage }, employeeId, epiItemId, companyId)
  }

  // Ficha completa de EPI de um colaborador — histórico de todas as entregas
  @Roles(Role.ADMIN_SYSTEM, Role.TECH_SAFETY, Role.HR_ADMIN, Role.MANAGER)
  @RequirePermissions(Permission.EPI_READ)
  @Get('employee/:employeeId')
  findEmployeeCard(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.epiDeliveriesService.findEmployeeCard(employeeId, user)
  }

  @Roles(Role.ADMIN_SYSTEM, Role.TECH_SAFETY, Role.HR_ADMIN, Role.MANAGER)
  @RequirePermissions(Permission.EPI_READ)
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.epiDeliveriesService.findOne(id, user)
  }

  @Roles(Role.ADMIN_SYSTEM, Role.TECH_SAFETY, Role.HR_ADMIN)
  @RequirePermissions(Permission.EPI_WRITE)
  @Post()
  create(
    @Body(new ZodPipe(CreateEpiDeliverySchema)) dto: CreateEpiDeliveryDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.epiDeliveriesService.create(dto, user)
  }

  // Patch restrito: só permite atualizar notes e returnedAt
  @Roles(Role.ADMIN_SYSTEM, Role.TECH_SAFETY, Role.HR_ADMIN)
  @RequirePermissions(Permission.EPI_WRITE)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(UpdateEpiDeliverySchema)) dto: UpdateEpiDeliveryDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.epiDeliveriesService.update(id, dto, user)
  }

  @Roles(Role.ADMIN_SYSTEM, Role.TECH_SAFETY)
  @RequirePermissions(Permission.EPI_WRITE)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.epiDeliveriesService.remove(id, user)
    return null
  }
}
