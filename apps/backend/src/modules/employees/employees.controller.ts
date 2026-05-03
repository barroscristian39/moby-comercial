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
import { EmployeesService } from './employees.service'
import { CreateEmployeeSchema, CreateEmployeeDto } from './dto/create-employee.dto'
import { UpdateEmployeeSchema, UpdateEmployeeDto } from './dto/update-employee.dto'
import { ZodPipe } from '../../common/pipes/zod.pipe'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequestUser, Role, PaginationSchema } from '@moby/shared'

const EmployeeFilterSchema = PaginationSchema.extend({
  unitId: z.string().uuid().optional(),
  sectorId: z.string().uuid().optional(),
  jobFunctionId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
})

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Roles(Role.ADMIN_SYSTEM, Role.TECH_SAFETY, Role.HR_ADMIN, Role.MANAGER)
  @Get()
  findAll(
    @CurrentUser() user: RequestUser,
    @Query(new ZodPipe(EmployeeFilterSchema)) query: any,
  ) {
    const { page, perPage, unitId, sectorId, jobFunctionId, companyId, search, isActive } = query
    return this.employeesService.findAll(user, { page, perPage }, unitId, sectorId, jobFunctionId, search, isActive, companyId)
  }

  @Roles(Role.ADMIN_SYSTEM, Role.TECH_SAFETY, Role.HR_ADMIN, Role.MANAGER)
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.employeesService.findOne(id, user)
  }

  @Roles(Role.ADMIN_SYSTEM, Role.HR_ADMIN)
  @Post()
  create(
    @Body(new ZodPipe(CreateEmployeeSchema)) dto: CreateEmployeeDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.employeesService.create(dto, user)
  }

  @Roles(Role.ADMIN_SYSTEM, Role.HR_ADMIN)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(UpdateEmployeeSchema)) dto: UpdateEmployeeDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.employeesService.update(id, dto, user)
  }

  @Roles(Role.ADMIN_SYSTEM, Role.HR_ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.employeesService.remove(id, user)
    return null
  }
}
