import { Module } from '@nestjs/common'
import { SectorsController } from './sectors.controller'
import { SectorsService } from './sectors.service'
import { SectorsRepository } from './sectors.repository'

@Module({
  controllers: [SectorsController],
  providers: [SectorsService, SectorsRepository],
  exports: [SectorsService, SectorsRepository],
})
export class SectorsModule {}
