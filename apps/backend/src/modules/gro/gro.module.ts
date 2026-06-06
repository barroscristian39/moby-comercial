import { Module } from '@nestjs/common'
import { AuthorizationModule } from '../../common/authorization/authorization.module'
import { PrismaModule } from '../../database/prisma.module'
import { GroController } from './gro.controller'
import { GroRepository } from './gro.repository'
import { GroService } from './gro.service'

@Module({
  imports: [PrismaModule, AuthorizationModule],
  controllers: [GroController],
  providers: [GroRepository, GroService],
  exports: [GroService],
})
export class GroModule {}
