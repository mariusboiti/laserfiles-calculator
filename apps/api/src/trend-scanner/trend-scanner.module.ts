import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TrendAggregationService } from './trend-aggregation.service';
import { LaserTrendIntelligenceService } from './trend-intelligence.service';
import { TrendAlertService } from './trend-alert.service';
import { TrendScannerController } from './trend-scanner.controller';

@Module({
  imports: [PrismaModule],
  controllers: [TrendScannerController],
  providers: [TrendAggregationService, LaserTrendIntelligenceService, TrendAlertService],
  exports: [LaserTrendIntelligenceService, TrendAlertService],
})
export class TrendScannerModule {}
