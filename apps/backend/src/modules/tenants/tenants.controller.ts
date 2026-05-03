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
import { PaginationSchema, Permission, RequestUser, TenantStatus } from '@moby/shared'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { ManualAudit } from '../../common/decorators/manual-audit.decorator'
import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { ZodPipe } from '../../common/pipes/zod.pipe'
import { CreateTenantDto, CreateTenantSchema } from './dto/create-tenant.dto'
import {
  UpdateTenantDto,
  UpdateTenantSchema,
  UpdateTenantStatusDto,
  UpdateTenantStatusSchema,
} from './dto/update-tenant.dto'
import { TenantsService } from './tenants.service'

const TenantQuerySchema = PaginationSchema.extend({
  search: z.string().optional(),
  status: z.nativeEnum(TenantStatus).optional(),
})

@ManualAudit()
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @RequirePermissions(Permission.TENANTS_READ)
  @Get()
  findAll(@Query(new ZodPipe(TenantQuerySchema)) query: z.infer<typeof TenantQuerySchema>) {
    const { page, perPage, search, status } = query
    return this.tenantsService.findAll({ page, perPage }, search, status)
  }

  @RequirePermissions(Permission.TENANTS_READ)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantsService.findOne(id)
  }

  @RequirePermissions(Permission.TENANTS_WRITE)
  @Post()
  create(
    @Body(new ZodPipe(CreateTenantSchema)) dto: CreateTenantDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.tenantsService.create(dto, user)
  }

  @RequirePermissions(Permission.TENANTS_WRITE)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(UpdateTenantSchema)) dto: UpdateTenantDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.tenantsService.update(id, dto, user)
  }

  @RequirePermissions(Permission.TENANT_STATUS_WRITE)
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(UpdateTenantStatusSchema)) dto: UpdateTenantStatusDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.tenantsService.updateStatus(id, dto, user)
  }

  @RequirePermissions(Permission.TENANTS_WRITE)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.tenantsService.remove(id, user)
    return null
  }
}
