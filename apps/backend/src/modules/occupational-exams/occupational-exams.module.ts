import { Module } from '@nestjs/common'
import { PrismaModule } from '../../database/prisma.module'
import { OccupationalExamsController } from './occupational-exams.controller'
import { OccupationalExamsRepository } from './occupational-exams.repository'
import { OccupationalExamsService } from './occupational-exams.service'

@Module({
  imports: [PrismaModule],
  controllers: [OccupationalExamsController],
  providers: [OccupationalExamsService, OccupationalExamsRepository],
})
export class OccupationalExamsModule {}
