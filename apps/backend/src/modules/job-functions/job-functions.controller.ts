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
import { JobFunctionsService } from './job-functions.service'
import { CreateJobFunctionSchema, CreateJobFunctionDto } from './dto/create-job-function.dto'
import { UpdateJobFunctionSchema, UpdateJobFunctionDto } from './dto/update-job-function.dto'
import { ZodPipe } from '../../common/pipes/zod.pipe'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequestUser, Role, PaginationSchema } from '@moby/shared'

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('job-functions')
export class JobFunctionsController {
  constructor(private readonly jobFunctionsService: JobFunctionsService) {}

  @Roles(Role.ADMIN_SYSTEM, Role.TECH_SAFETY, Role.HR_ADMIN, Role.MANAGER)
  @Get()
  findAll(
    @CurrentUser() user: RequestUser,
    @Query(new ZodPipe(PaginationSchema)) pagination: any,
    @Query('unitId') unitId?: string,
    @Query('sectorId') sectorId?: string,
    @Query('search') search?: string,
    @Query('companyId') companyId?: string,
  ) {
    return this.jobFunctionsService.findAll(user, pagination, unitId, sectorId, search, companyId)
  }

  @Roles(Role.ADMIN_SYSTEM, Role.TECH_SAFETY, Role.HR_ADMIN, Role.MANAGER)
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.jobFunctionsService.findOne(id, user)
  }

  @Roles(Role.ADMIN_SYSTEM, Role.HR_ADMIN, Role.TECH_SAFETY)
  @Post()
  create(
    @Body(new ZodPipe(CreateJobFunctionSchema)) dto: CreateJobFunctionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.jobFunctionsService.create(dto, user)
  }

  @Roles(Role.ADMIN_SYSTEM, Role.HR_ADMIN, Role.TECH_SAFETY)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(UpdateJobFunctionSchema)) dto: UpdateJobFunctionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.jobFunctionsService.update(id, dto, user)
  }

  @Roles(Role.ADMIN_SYSTEM, Role.HR_ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.jobFunctionsService.remove(id, user)
    return null
  }
}
