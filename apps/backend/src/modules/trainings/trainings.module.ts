import { Module } from '@nestjs/common'
import { PrismaModule } from '../../database/prisma.module'
import { TrainingsController } from './trainings.controller'
import { TrainingsRepository } from './trainings.repository'
import { TrainingsService } from './trainings.service'

@Module({
  imports: [PrismaModule],
  controllers: [TrainingsController],
  providers: [TrainingsService, TrainingsRepository],
})
export class TrainingsModule {}
