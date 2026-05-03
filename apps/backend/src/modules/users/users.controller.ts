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
import { CreateUserDto, CreateUserSchema } from './dto/create-user.dto'
import { UpdateUserDto, UpdateUserSchema } from './dto/update-user.dto'
import { UsersService } from './users.service'

const UserQuerySchema = PaginationSchema.extend({
  tenantId: z.string().uuid().optional(),
  search: z.string().optional(),
})

@ManualAudit()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @RequirePermissions(Permission.USERS_READ)
  @Get()
  findAll(
    @CurrentUser() user: RequestUser,
    @Query(new ZodPipe(UserQuerySchema)) query: z.infer<typeof UserQuerySchema>,
  ) {
    const { page, perPage, search, tenantId } = query
    return this.usersService.findAll(user, { page, perPage }, search, tenantId)
  }

  @RequirePermissions(Permission.USERS_READ)
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.usersService.findOne(id, user)
  }

  @RequirePermissions(Permission.USERS_WRITE)
  @Post()
  create(
    @Body(new ZodPipe(CreateUserSchema)) dto: CreateUserDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.usersService.create(dto, user)
  }

  @RequirePermissions(Permission.USERS_WRITE)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(UpdateUserSchema)) dto: UpdateUserDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.usersService.update(id, dto, user)
  }

  @RequirePermissions(Permission.USERS_WRITE)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.usersService.remove(id, user)
    return null
  }
}
