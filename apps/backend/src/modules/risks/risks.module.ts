import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module'
import { PrismaModule } from '../../database/prisma.module'
import { RisksController } from './risks.controller'
import { RisksRepository } from './risks.repository'
import { RisksService } from './risks.service'

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [RisksController],
  providers: [RisksRepository, RisksService],
  exports: [RisksService],
})
export class RisksModule {}
