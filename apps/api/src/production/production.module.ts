import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SeasonsController } from './production.seasons.controller';
import { SeasonsService } from './production.seasons.service';
import { BatchesController } from './production.batches.controller';
import { BatchesService } from './production.batches.service';
import { TodayQueueController } from './production.today-queue.controller';
import { TodayQueueService } from './production.today-queue.service';

@Module({
  imports: [PrismaModule],
  controllers: [SeasonsController, BatchesController, TodayQueueController],
  providers: [SeasonsService, BatchesService, TodayQueueService],
})
export class ProductionModule {}
