import { Module } from '@nestjs/common'
import { AuthorizationModule } from '../../common/authorization/authorization.module'
import { PrismaModule } from '../../database/prisma.module'
import { AuditModule } from '../audit/audit.module'
import { FunctionsController } from './functions.controller'
import { FunctionsRepository } from './functions.repository'
import { FunctionsService } from './functions.service'

@Module({
  imports: [PrismaModule, AuditModule, AuthorizationModule],
  controllers: [FunctionsController],
  providers: [FunctionsRepository, FunctionsService],
  exports: [FunctionsRepository, FunctionsService],
})
export class FunctionsModule {}
