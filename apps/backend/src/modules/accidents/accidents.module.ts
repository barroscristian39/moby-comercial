import { Module } from '@nestjs/common'
import { PrismaModule } from '../../database/prisma.module'
import { AuditModule } from '../audit/audit.module'
import { AccidentsController } from './accidents.controller'
import { AccidentsRepository } from './accidents.repository'
import { AccidentsService } from './accidents.service'

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [AccidentsController],
  providers: [AccidentsRepository, AccidentsService],
  exports: [AccidentsService],
})
export class AccidentsModule {}
