import { Module } from '@nestjs/common'
import { EpiDeliveriesController } from './epi-deliveries.controller'
import { EpiDeliveriesService } from './epi-deliveries.service'
import { EpiDeliveriesRepository } from './epi-deliveries.repository'
import { EpiItemsModule } from '../epi-items/epi-items.module'
import { PrismaModule } from '../../database/prisma.module'

@Module({
  imports: [
    PrismaModule,
    // Importa EpiItemsModule para usar EpiItemsRepository (ajuste de estoque)
    EpiItemsModule,
  ],
  controllers: [EpiDeliveriesController],
  providers: [EpiDeliveriesService, EpiDeliveriesRepository],
})
export class EpiDeliveriesModule {}
