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
import { PaginationSchema, Permission, RequestUser, Role } from '@moby/shared'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { ManualAudit } from '../../common/decorators/manual-audit.decorator'
import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { ZodPipe } from '../../common/pipes/zod.pipe'
import { CreateFunctionDto, CreateFunctionSchema } from './dto/create-function.dto'
import { SafeIdSchema } from './dto/create-function.dto'
import { UpdateFunctionDto, UpdateFunctionSchema } from './dto/update-function.dto'
import { FunctionsService } from './functions.service'

const FunctionQuerySchema = PaginationSchema.extend({
  tenantId: z.string().uuid().optional(),
  unitId: SafeIdSchema.optional(),
  search: z.string().trim().optional(),
})

@ManualAudit()
@Controller('functions')
export class FunctionsController {
  constructor(private readonly functionsService: FunctionsService) {}

  @RequirePermissions(Permission.DOCUMENTS_READ)
  @Get()
  findAll(
    @CurrentUser() user: RequestUser,
    @Query(new ZodPipe(FunctionQuerySchema)) query: z.infer<typeof FunctionQuerySchema>,
  ) {
    const { page, perPage, tenantId, unitId, search } = query
    return this.functionsService.findAll(user, { page, perPage }, { tenantId, unitId, search })
  }

  @RequirePermissions(Permission.DOCUMENTS_READ)
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.functionsService.findOne(id, user)
  }

  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN)
  @RequirePermissions(Permission.DOCUMENTS_WRITE)
  @Post()
  create(
    @Body(new ZodPipe(CreateFunctionSchema)) dto: CreateFunctionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.functionsService.create(dto, user)
  }

  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN)
  @RequirePermissions(Permission.DOCUMENTS_WRITE)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(UpdateFunctionSchema)) dto: UpdateFunctionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.functionsService.update(id, dto, user)
  }

  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN)
  @RequirePermissions(Permission.DOCUMENTS_WRITE)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.functionsService.remove(id, user)
    return null
  }
}
