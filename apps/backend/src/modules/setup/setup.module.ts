import { Module } from '@nestjs/common'
import { AuthorizationModule } from '../../common/authorization/authorization.module'
import { PrismaModule } from '../../database/prisma.module'
import { SetupController } from './setup.controller'
import { SetupRepository } from './setup.repository'
import { SetupService } from './setup.service'

@Module({
  imports: [PrismaModule, AuthorizationModule],
  controllers: [SetupController],
  providers: [SetupRepository, SetupService],
})
export class SetupModule {}
