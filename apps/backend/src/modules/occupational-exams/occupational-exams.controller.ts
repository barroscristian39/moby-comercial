import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { z } from 'zod'
import { Permission, PaginationSchema, RequestUser, Role } from '@moby/shared'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { ZodPipe } from '../../common/pipes/zod.pipe'
import { CreateOccupationalExamDto, CreateOccupationalExamSchema } from './dto/create-occupational-exam.dto'
import { UpdateOccupationalExamDto, UpdateOccupationalExamSchema } from './dto/update-occupational-exam.dto'
import { OccupationalExamsService } from './occupational-exams.service'

const OccupationalExamFilterSchema = PaginationSchema.extend({
  employeeId: z.string().uuid().optional(),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  status: z.enum(['expired', 'expiring', 'valid']).optional(),
})

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('occupational-exams')
export class OccupationalExamsController {
  constructor(private readonly examsService: OccupationalExamsService) {}

  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.TECNICO_SST, Role.RH, Role.GESTOR)
  @RequirePermissions(Permission.EXAMS_READ)
  @Get()
  findAll(@CurrentUser() user: RequestUser, @Query(new ZodPipe(OccupationalExamFilterSchema)) query: any) {
    const { page, perPage, employeeId, search, isActive, status } = query
    return this.examsService.findAll(user, { page, perPage }, { employeeId, search, isActive, status })
  }

  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.TECNICO_SST, Role.RH, Role.GESTOR)
  @RequirePermissions(Permission.EXAMS_READ)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.examsService.findOne(id, user)
  }

  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.TECNICO_SST, Role.RH)
  @RequirePermissions(Permission.EXAMS_WRITE)
  @Post()
  create(@Body(new ZodPipe(CreateOccupationalExamSchema)) dto: CreateOccupationalExamDto, @CurrentUser() user: RequestUser) {
    return this.examsService.create(dto, user)
  }

  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.TECNICO_SST, Role.RH)
  @RequirePermissions(Permission.EXAMS_WRITE)
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(UpdateOccupationalExamSchema)) dto: UpdateOccupationalExamDto, @CurrentUser() user: RequestUser) {
    return this.examsService.update(id, dto, user)
  }

  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.TECNICO_SST, Role.RH)
  @RequirePermissions(Permission.EXAMS_WRITE)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    await this.examsService.remove(id, user)
    return null
  }
}
