import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TrendAggregationService } from './trend-aggregation.service';
import { LaserTrendIntelligenceService } from './trend-intelligence.service';
import { TrendAlertService } from './trend-alert.service';
import { TrendProductGenerationService } from './trend-product-generation.service';
import { ProfitIntelligenceService } from './profit-intelligence.service';
import { TrendConfidenceEngine } from './trend-confidence.engine';
import { MicroNicheDetectorService } from './micro-niche-detector.service';
import { TrendLifecycleService } from './trend-lifecycle.service';
import { UserTrendPersonalizationService } from './user-trend-personalization.service';
import { ContentIdeaGeneratorService } from './content-idea-generator.service';
import { ProductionTrendAdvisorService } from './production-trend-advisor.service';
import { MaterialTrendIntelligenceService } from './material-trend-intelligence.service';
import { TrendScannerController } from './trend-scanner.controller';

@Module({
  imports: [PrismaModule],
  controllers: [TrendScannerController],
  providers: [
    TrendAggregationService,
    LaserTrendIntelligenceService,
    TrendAlertService,
    TrendProductGenerationService,
    ProfitIntelligenceService,
    TrendConfidenceEngine,
    MicroNicheDetectorService,
    TrendLifecycleService,
    UserTrendPersonalizationService,
    ContentIdeaGeneratorService,
    ProductionTrendAdvisorService,
    MaterialTrendIntelligenceService,
  ],
  exports: [
    LaserTrendIntelligenceService,
    TrendAlertService,
    TrendProductGenerationService,
    ProfitIntelligenceService,
    TrendConfidenceEngine,
    MicroNicheDetectorService,
    TrendLifecycleService,
    MaterialTrendIntelligenceService,
  ],
})
export class TrendScannerModule {}
