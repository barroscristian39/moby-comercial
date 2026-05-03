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
import { PaginationSchema, Permission, RequestUser } from '@moby/shared'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { ManualAudit } from '../../common/decorators/manual-audit.decorator'
import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { ZodPipe } from '../../common/pipes/zod.pipe'
import { CompaniesService } from './companies.service'
import { CreateCompanyDto, CreateCompanySchema } from './dto/create-company.dto'
import { UpdateCompanyDto, UpdateCompanySchema } from './dto/update-company.dto'

const CompanyQuerySchema = PaginationSchema.extend({
  tenantId: z.string().uuid().optional(),
  search: z.string().optional(),
})

@ManualAudit()
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @RequirePermissions(Permission.COMPANIES_READ)
  @Get()
  findAll(
    @CurrentUser() user: RequestUser,
    @Query(new ZodPipe(CompanyQuerySchema)) query: z.infer<typeof CompanyQuerySchema>,
  ) {
    const { page, perPage, tenantId, search } = query
    return this.companiesService.findAll(user, { page, perPage }, search, tenantId)
  }

  @RequirePermissions(Permission.COMPANIES_READ)
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.companiesService.findOne(id, user)
  }

  @RequirePermissions(Permission.COMPANIES_WRITE)
  @Post()
  create(
    @Body(new ZodPipe(CreateCompanySchema)) dto: CreateCompanyDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.companiesService.create(dto, user)
  }

  @RequirePermissions(Permission.COMPANIES_WRITE)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(UpdateCompanySchema)) dto: UpdateCompanyDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.companiesService.update(id, dto, user)
  }

  @RequirePermissions(Permission.COMPANIES_WRITE)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.companiesService.remove(id, user)
    return null
  }
}
