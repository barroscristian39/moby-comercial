import { Module } from '@nestjs/common'
import { AuthorizationModule } from '../../common/authorization/authorization.module'
import { PrismaModule } from '../../database/prisma.module'
import { AuditModule } from '../audit/audit.module'
import { TenantsController } from './tenants.controller'
import { TenantsRepository } from './tenants.repository'
import { TenantsService } from './tenants.service'

@Module({
  imports: [PrismaModule, AuthorizationModule, AuditModule],
  controllers: [TenantsController],
  providers: [TenantsRepository, TenantsService],
})
export class TenantsModule {}
