import { Module } from '@nestjs/common'
import { EpiItemsController } from './epi-items.controller'
import { EpiItemsService } from './epi-items.service'
import { EpiItemsRepository } from './epi-items.repository'
import { PrismaModule } from '../../database/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [EpiItemsController],
  providers: [EpiItemsService, EpiItemsRepository],
  // EpiItemsRepository exportado para uso no EpiDeliveriesService (ajuste de estoque)
  exports: [EpiItemsRepository],
})
export class EpiItemsModule {}
