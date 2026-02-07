import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
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
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('trend-scanner')
@UseGuards(JwtAuthGuard)
export class TrendScannerController {
  constructor(
    private readonly intelligence: LaserTrendIntelligenceService,
    private readonly alerts: TrendAlertService,
    private readonly productGen: TrendProductGenerationService,
    private readonly profit: ProfitIntelligenceService,
    private readonly confidence: TrendConfidenceEngine,
    private readonly niches: MicroNicheDetectorService,
    private readonly lifecycle: TrendLifecycleService,
    private readonly personalization: UserTrendPersonalizationService,
    private readonly content: ContentIdeaGeneratorService,
    private readonly productionAdvisor: ProductionTrendAdvisorService,
    private readonly materialTrends: MaterialTrendIntelligenceService,
  ) {}

  // ─── Scans ────────────────────────────────────────────────────────────────

  @Post('scan')
  async runScan(@Req() req: any, @Body() body: { scanType?: string }) {
    const userId = req.user?.id || req.user?.sub;
    return this.intelligence.runFullScan(userId, body.scanType || 'full');
  }

  @Get('scan/latest')
  async getLatestScan(@Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.intelligence.getLatestScan(userId);
  }

  @Get('scan/history')
  async getScanHistory(@Req() req: any, @Query('take') take?: string) {
    const userId = req.user?.id || req.user?.sub;
    return this.intelligence.getScanHistory(userId, take ? parseInt(take) : 10);
  }

  // ─── Product Generation ─────────────────────────────────────────────────

  @Post('generate-products')
  async generateProducts(@Body() body: { trendTitle: string; keywords: string[]; category: string }) {
    return this.productGen.generateProductsFromTrend(body.trendTitle, body.keywords, body.category);
  }

  @Post('generate-products/bulk')
  async generateProductsBulk(@Body() body: { opportunities: Array<{ title: string; keywords: string[]; category: string }> }) {
    return this.productGen.generateBulkFromOpportunities(body.opportunities);
  }

  // ─── Profit Intelligence ────────────────────────────────────────────────

  @Post('profit/analyze')
  async analyzeProfitability(@Body() body: {
    productType: string;
    materials: string[];
    sizeMm: { width: number; height: number };
    cutTimeMins: number;
    engraveTimeMins: number;
    suggestedPrice: number;
    competitionDensity?: number;
    demandStrength?: number;
  }) {
    return this.profit.analyzeProfitability(body);
  }

  @Get('profit/materials')
  getMaterialCosts() {
    return this.profit.getMaterialCosts();
  }

  // ─── Confidence Engine ──────────────────────────────────────────────────

  @Post('confidence/assess')
  assessConfidence(@Body() body: {
    trendTitle: string;
    sources: string[];
    signalStrengths: number[];
    growthRates: number[];
    competitionDensity: number;
    daysActive: number;
    volumeHistory?: number[];
  }) {
    return this.confidence.assessConfidence(body);
  }

  // ─── Micro-Niche Detection ─────────────────────────────────────────────

  @Post('niches/detect')
  detectNiches(@Body() body: { keywords: string[]; categories: string[] }) {
    return this.niches.detectNiches(body.keywords, body.categories);
  }

  // ─── Lifecycle Tracking ─────────────────────────────────────────────────

  @Post('lifecycle/classify')
  classifyLifecycle(@Body() body: {
    trendTitle: string;
    volumeHistory: number[];
    growthRates: number[];
    daysActive: number;
    competitionDensity: number;
    currentVolume: number;
  }) {
    return this.lifecycle.classifyLifecycle(body);
  }

  @Post('lifecycle/batch')
  classifyLifecycleBatch(@Body() body: { trends: Array<{
    trendTitle: string;
    volumeHistory: number[];
    growthRates: number[];
    daysActive: number;
    competitionDensity: number;
    currentVolume: number;
  }> }) {
    return this.lifecycle.classifyBatch(body.trends);
  }

  // ─── Personalized Feed ──────────────────────────────────────────────────

  @Post('personalized-feed')
  getPersonalizedFeed(@Req() req: any, @Body() body: {
    activityData?: any;
    trends: Array<{
      title: string;
      category: string;
      keywords: string[];
      materials: string[];
      styles: string[];
      priceRange: { min: number; max: number };
      trendStrength: number;
      growthVelocity: number;
      difficulty: string;
    }>;
  }) {
    const userId = req.user?.id || req.user?.sub;
    const profile = this.personalization.buildUserProfile(userId, body.activityData);
    return this.personalization.generatePersonalizedFeed(profile, body.trends);
  }

  // ─── Content Ideas ──────────────────────────────────────────────────────

  @Post('content-ideas')
  generateContentIdeas(@Body() body: {
    trendTitle: string;
    productName: string;
    productType: string;
    materials: string[];
    styles: string[];
    targetAudience: string;
    priceRange: { min: number; max: number };
    season?: string;
  }) {
    return this.content.generateContentPlan(body);
  }

  // ─── Production Advisor ─────────────────────────────────────────────────

  @Post('production/recommend')
  getProductionRecommendation(@Body() body: {
    productType: string;
    trendTitle: string;
    trendStrength: number;
    growthVelocity: number;
    competitionDensity: number;
    materials: string[];
    sizeMm: { width: number; height: number };
    cutTimeMins: number;
    engraveTimeMins: number;
    suggestedPrice: number;
    seasonalEvent?: string;
    daysUntilEvent?: number;
  }) {
    return this.productionAdvisor.generateRecommendation(body);
  }

  // ─── Material Trends ───────────────────────────────────────────────────

  @Get('materials/trends')
  getMaterialTrends() {
    return this.materialTrends.getAllMaterialTrends();
  }

  @Get('materials/trends/:id')
  getMaterialTrend(@Param('id') id: string) {
    return this.materialTrends.getMaterialTrend(id);
  }

  @Get('materials/comparison')
  getMaterialComparison(@Query('ids') ids?: string) {
    const materialIds = ids ? ids.split(',') : undefined;
    return this.materialTrends.getComparison(materialIds);
  }

  @Get('materials/seasonal')
  getSeasonalMaterialRecommendations(@Query('month') month?: string) {
    return this.materialTrends.getSeasonalRecommendations(month ? parseInt(month) : undefined);
  }

  // ─── Subscriptions ────────────────────────────────────────────────────────

  @Get('subscription')
  async getSubscription(@Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.alerts.getSubscription(userId);
  }

  @Post('subscription')
  async upsertSubscription(@Req() req: any, @Body() body: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.alerts.upsertSubscription(userId, body);
  }

  @Patch('subscription/deactivate')
  async deactivateSubscription(@Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.alerts.deactivateSubscription(userId);
  }

  // ─── Alerts ───────────────────────────────────────────────────────────────

  @Get('alerts')
  async getAlerts(@Req() req: any, @Query('unreadOnly') unreadOnly?: string) {
    const userId = req.user?.id || req.user?.sub;
    return this.alerts.getAlerts(userId, unreadOnly === 'true');
  }

  @Get('alerts/unread-count')
  async getUnreadCount(@Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return { count: await this.alerts.getUnreadCount(userId) };
  }

  @Patch('alerts/:id/read')
  async markAlertRead(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.id || req.user?.sub;
    return this.alerts.markAlertRead(id, userId);
  }

  @Patch('alerts/read-all')
  async markAllRead(@Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.alerts.markAllRead(userId);
  }
}
