import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { z } from 'zod'
import { PaginationSchema, Permission, RequestUser, Role } from '@moby/shared'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { ZodPipe } from '../../common/pipes/zod.pipe'
import { CreateTrainingDto, CreateTrainingSchema } from './dto/create-training.dto'
import { UpdateTrainingDto, UpdateTrainingSchema } from './dto/update-training.dto'
import { TrainingsService } from './trainings.service'

const TrainingFilterSchema = PaginationSchema.extend({
  employeeId: z.string().uuid().optional(),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  status: z.enum(['expired', 'expiring', 'valid']).optional(),
})

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('trainings')
export class TrainingsController {
  constructor(private readonly trainingsService: TrainingsService) {}

  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.TECNICO_SST, Role.RH, Role.GESTOR)
  @RequirePermissions(Permission.TRAININGS_READ)
  @Get()
  findAll(@CurrentUser() user: RequestUser, @Query(new ZodPipe(TrainingFilterSchema)) query: any) {
    const { page, perPage, employeeId, search, isActive, status } = query
    return this.trainingsService.findAll(user, { page, perPage }, { employeeId, search, isActive, status })
  }

  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.TECNICO_SST, Role.RH, Role.GESTOR)
  @RequirePermissions(Permission.TRAININGS_READ)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.trainingsService.findOne(id, user)
  }

  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.TECNICO_SST, Role.RH)
  @RequirePermissions(Permission.TRAININGS_WRITE)
  @Post()
  create(@Body(new ZodPipe(CreateTrainingSchema)) dto: CreateTrainingDto, @CurrentUser() user: RequestUser) {
    return this.trainingsService.create(dto, user)
  }

  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.TECNICO_SST, Role.RH)
  @RequirePermissions(Permission.TRAININGS_WRITE)
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(UpdateTrainingSchema)) dto: UpdateTrainingDto, @CurrentUser() user: RequestUser) {
    return this.trainingsService.update(id, dto, user)
  }

  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.TECNICO_SST, Role.RH)
  @RequirePermissions(Permission.TRAININGS_WRITE)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    await this.trainingsService.remove(id, user)
    return null
  }
}
