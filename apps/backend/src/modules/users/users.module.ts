import { Module } from '@nestjs/common'
import { AuthorizationModule } from '../../common/authorization/authorization.module'
import { AuditModule } from '../audit/audit.module'
import { UsersController } from './users.controller'
import { UsersService } from './users.service'
import { UsersRepository } from './users.repository'

@Module({
  imports: [AuthorizationModule, AuditModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
