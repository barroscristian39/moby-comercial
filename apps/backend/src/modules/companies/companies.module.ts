import { Module } from '@nestjs/common'
import { AuthorizationModule } from '../../common/authorization/authorization.module'
import { AuditModule } from '../audit/audit.module'
import { CompaniesController } from './companies.controller'
import { CompaniesService } from './companies.service'
import { CompaniesRepository } from './companies.repository'

@Module({
  imports: [AuthorizationModule, AuditModule],
  controllers: [CompaniesController],
  providers: [CompaniesService, CompaniesRepository],
  exports: [CompaniesService, CompaniesRepository],
})
export class CompaniesModule {}
