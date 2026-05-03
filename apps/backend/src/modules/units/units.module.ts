import { Module } from '@nestjs/common'
import { AuthorizationModule } from '../../common/authorization/authorization.module'
import { AuditModule } from '../audit/audit.module'
import { UnitsController } from './units.controller'
import { UnitsService } from './units.service'
import { UnitsRepository } from './units.repository'

@Module({
  imports: [AuthorizationModule, AuditModule],
  controllers: [UnitsController],
  providers: [UnitsService, UnitsRepository],
  exports: [UnitsService, UnitsRepository],
})
export class UnitsModule {}
