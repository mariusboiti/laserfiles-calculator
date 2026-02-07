import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TrendAggregationService, AggregatedSignal } from './trend-aggregation.service';

// ─── Types ──────────────────────────────────────────────────────────────────

interface TrendOpportunityDto {
  title: string;
  description: string;
  category: string;
  sources: string[];
  keywords: string[];
  trendStrength: number;
  growthVelocity: number;
  competitionDensity: number;
  profitPotential: number;
  seasonalityScore: number;
  overallScore: number;
  productIdeas: ProductIdea[];
  recommendedSizes: SizeRec[];
  materialSuggestions: string[];
  styleHints: string[];
  priceRange: { low: number; mid: number; high: number; premium: number };
  peakMonths: number[];
  daysUntilPeak: number | null;
  isGapOpportunity: boolean;
  demandLevel: string;
  supplyLevel: string;
  gapDescription: string | null;
}

interface ProductIdea {
  name: string;
  type: string;
  difficulty: string;
  estimatedTimeMins: number;
  materialCost: number;
  suggestedPrice: number;
}

interface SizeRec {
  label: string;
  widthMm: number;
  heightMm: number;
}

interface StyleTrend {
  name: string;
  description: string;
  strength: number;
  examples: string[];
  materials: string[];
  keywords: string[];
}

interface SeasonalForecast {
  event: string;
  peakDate: string;
  daysUntil: number;
  relevantProducts: string[];
  expectedDemandBoost: number;
  preparationTip: string;
}

// ─── Laser product knowledge base ───────────────────────────────────────────

const PRODUCT_IDEAS_DB: Record<string, ProductIdea[]> = {
  'pet memorial': [
    { name: 'Engraved Memorial Plaque', type: 'plaque', difficulty: 'easy', estimatedTimeMins: 15, materialCost: 3.50, suggestedPrice: 34.99 },
    { name: 'Layered Pet Portrait', type: 'layered-art', difficulty: 'medium', estimatedTimeMins: 35, materialCost: 6.00, suggestedPrice: 55.00 },
    { name: 'Custom Pet Keychain', type: 'keychain', difficulty: 'easy', estimatedTimeMins: 5, materialCost: 1.20, suggestedPrice: 14.99 },
    { name: 'Pet Photo Frame', type: 'frame', difficulty: 'easy', estimatedTimeMins: 12, materialCost: 4.00, suggestedPrice: 28.00 },
    { name: 'Memorial Ornament', type: 'ornament', difficulty: 'easy', estimatedTimeMins: 8, materialCost: 2.00, suggestedPrice: 18.99 },
  ],
  'mandala': [
    { name: 'Layered Mandala Wall Art', type: 'layered-art', difficulty: 'hard', estimatedTimeMins: 60, materialCost: 8.00, suggestedPrice: 65.00 },
    { name: 'Mandala Night Lamp', type: 'lamp', difficulty: 'hard', estimatedTimeMins: 45, materialCost: 12.00, suggestedPrice: 75.00 },
    { name: 'Mandala Coaster Set', type: 'coaster', difficulty: 'easy', estimatedTimeMins: 20, materialCost: 4.00, suggestedPrice: 24.99 },
    { name: 'Mandala Clock Face', type: 'clock', difficulty: 'medium', estimatedTimeMins: 25, materialCost: 6.00, suggestedPrice: 42.00 },
  ],
  'cutting board': [
    { name: 'Personalized Cutting Board', type: 'cutting-board', difficulty: 'easy', estimatedTimeMins: 10, materialCost: 8.00, suggestedPrice: 42.00 },
    { name: 'Recipe Engraved Board', type: 'cutting-board', difficulty: 'medium', estimatedTimeMins: 18, materialCost: 10.00, suggestedPrice: 55.00 },
    { name: 'Monogram Cheese Board', type: 'cutting-board', difficulty: 'easy', estimatedTimeMins: 8, materialCost: 7.00, suggestedPrice: 35.00 },
  ],
  'wedding': [
    { name: 'Guest Book Alternative', type: 'sign', difficulty: 'medium', estimatedTimeMins: 30, materialCost: 8.00, suggestedPrice: 48.00 },
    { name: 'Cake Topper', type: 'topper', difficulty: 'easy', estimatedTimeMins: 8, materialCost: 2.00, suggestedPrice: 15.00 },
    { name: 'Table Numbers Set', type: 'sign', difficulty: 'easy', estimatedTimeMins: 25, materialCost: 5.00, suggestedPrice: 35.00 },
    { name: 'Wedding Date Sign', type: 'sign', difficulty: 'easy', estimatedTimeMins: 12, materialCost: 4.00, suggestedPrice: 28.00 },
  ],
  'christmas': [
    { name: 'Custom Ornament', type: 'ornament', difficulty: 'easy', estimatedTimeMins: 5, materialCost: 1.50, suggestedPrice: 12.00 },
    { name: 'Advent Calendar', type: 'calendar', difficulty: 'hard', estimatedTimeMins: 90, materialCost: 15.00, suggestedPrice: 85.00 },
    { name: 'Snowflake Set', type: 'ornament', difficulty: 'easy', estimatedTimeMins: 15, materialCost: 3.00, suggestedPrice: 18.00 },
    { name: 'Tree Topper', type: 'topper', difficulty: 'medium', estimatedTimeMins: 20, materialCost: 4.00, suggestedPrice: 25.00 },
  ],
  'night light': [
    { name: 'Acrylic LED Night Light', type: 'lamp', difficulty: 'medium', estimatedTimeMins: 20, materialCost: 5.00, suggestedPrice: 32.00 },
    { name: 'Personalized Kids Lamp', type: 'lamp', difficulty: 'medium', estimatedTimeMins: 18, materialCost: 6.00, suggestedPrice: 35.00 },
    { name: 'Photo Night Light', type: 'lamp', difficulty: 'medium', estimatedTimeMins: 15, materialCost: 5.50, suggestedPrice: 30.00 },
  ],
  'geometric': [
    { name: 'Geometric Wall Clock', type: 'clock', difficulty: 'medium', estimatedTimeMins: 25, materialCost: 6.00, suggestedPrice: 45.00 },
    { name: 'Geometric Animal Art', type: 'wall-art', difficulty: 'medium', estimatedTimeMins: 20, materialCost: 4.00, suggestedPrice: 35.00 },
    { name: 'Geometric Planter', type: 'planter', difficulty: 'hard', estimatedTimeMins: 40, materialCost: 5.00, suggestedPrice: 38.00 },
  ],
  'farmhouse': [
    { name: 'Farmhouse Welcome Sign', type: 'sign', difficulty: 'easy', estimatedTimeMins: 15, materialCost: 5.00, suggestedPrice: 28.00 },
    { name: 'Kitchen Rules Sign', type: 'sign', difficulty: 'easy', estimatedTimeMins: 12, materialCost: 4.00, suggestedPrice: 22.00 },
    { name: 'Family Name Sign', type: 'sign', difficulty: 'easy', estimatedTimeMins: 10, materialCost: 5.00, suggestedPrice: 32.00 },
  ],
  'graduation': [
    { name: 'Graduation Plaque', type: 'plaque', difficulty: 'easy', estimatedTimeMins: 12, materialCost: 4.00, suggestedPrice: 25.00 },
    { name: 'Class of 2025 Keychain', type: 'keychain', difficulty: 'easy', estimatedTimeMins: 5, materialCost: 1.20, suggestedPrice: 12.00 },
    { name: 'Diploma Frame', type: 'frame', difficulty: 'medium', estimatedTimeMins: 18, materialCost: 6.00, suggestedPrice: 38.00 },
  ],
};

const STYLE_TRENDS_DB: StyleTrend[] = [
  { name: 'Minimalist Engraving', description: 'Clean lines, ample whitespace, single-weight strokes. Less is more.', strength: 82, examples: ['line art portraits', 'simple monograms', 'thin-line botanicals'], materials: ['plywood-3mm', 'bamboo', 'acrylic-clear'], keywords: ['minimalist', 'line art', 'clean'] },
  { name: 'Layered Mandala Art', description: 'Multi-layer cut pieces stacked for 3D depth. Intricate geometric patterns.', strength: 88, examples: ['mandala wall art', 'layered animal silhouettes', 'shadow boxes'], materials: ['plywood-3mm', 'mdf-3mm', 'basswood'], keywords: ['mandala', 'layered', '3d', 'shadow box'] },
  { name: 'Rustic Farmhouse', description: 'Weathered wood look, serif fonts, country motifs. Warm and homey.', strength: 65, examples: ['kitchen signs', 'welcome plaques', 'family name boards'], materials: ['plywood-6mm', 'reclaimed-wood', 'pine'], keywords: ['rustic', 'farmhouse', 'country', 'vintage'] },
  { name: 'Modern Geometric', description: 'Sharp angles, polygon shapes, mathematical precision. Contemporary feel.', strength: 75, examples: ['geometric clocks', 'polygon animal art', 'hexagonal shelves'], materials: ['plywood-3mm', 'acrylic-black', 'acrylic-clear'], keywords: ['geometric', 'polygon', 'modern', 'abstract'] },
  { name: 'Boho / Botanical', description: 'Organic shapes, leaf patterns, earthy vibes. Nature-inspired.', strength: 70, examples: ['leaf wall hangings', 'botanical prints', 'macrame-style cutouts'], materials: ['plywood-3mm', 'bamboo', 'cork'], keywords: ['boho', 'botanical', 'organic', 'nature'] },
  { name: 'Acrylic LED Glow', description: 'Edge-lit acrylic with LED bases. Glowing personalized designs.', strength: 80, examples: ['night lights', 'desk signs', 'photo lamps'], materials: ['acrylic-clear', 'acrylic-frosted'], keywords: ['acrylic', 'led', 'glow', 'night light', 'neon'] },
  { name: 'Topographic / Map Art', description: 'Layered terrain maps, city grids, elevation contours.', strength: 62, examples: ['city maps', 'mountain topo art', 'lake depth maps'], materials: ['plywood-3mm', 'mdf-3mm', 'cardstock'], keywords: ['topographic', 'map', 'terrain', 'city'] },
];

const SEASONAL_EVENTS: Array<{ event: string; month: number; day: number; products: string[]; boost: number; tip: string }> = [
  { event: "Valentine's Day", month: 2, day: 14, products: ['heart keychains', 'couple name signs', 'love letter boxes', 'photo frames'], boost: 85, tip: 'Start listing by mid-January. Heart-themed products peak 2 weeks before.' },
  { event: "Mother's Day", month: 5, day: 11, products: ['personalized jewelry boxes', 'family tree art', 'photo frames', 'garden markers'], boost: 78, tip: 'List by mid-April. "Mom" and "Grandma" personalization sells best.' },
  { event: "Father's Day", month: 6, day: 15, products: ['whiskey glass sets', 'tool organizers', 'desk signs', 'custom cutting boards'], boost: 72, tip: 'List by late May. Practical + personalized items outperform decorative.' },
  { event: 'Graduation Season', month: 6, day: 1, products: ['graduation plaques', 'class keychains', 'diploma frames', 'name signs'], boost: 70, tip: 'Start in April. Bulk orders from schools are high-margin.' },
  { event: 'Wedding Season Peak', month: 6, day: 15, products: ['guest book alternatives', 'cake toppers', 'table numbers', 'wedding signs'], boost: 80, tip: 'Wedding items sell March–September. Offer customization packages.' },
  { event: 'Back to School', month: 8, day: 15, products: ['teacher gifts', 'name tags', 'bookmarks', 'pencil holders'], boost: 55, tip: 'Teacher appreciation items sell well. Offer classroom sets.' },
  { event: 'Halloween', month: 10, day: 31, products: ['spooky signs', 'pumpkin decorations', 'skeleton art', 'bat garlands'], boost: 65, tip: 'Start in September. Layered shadow boxes with Halloween themes trend.' },
  { event: 'Christmas / Holiday', month: 12, day: 25, products: ['ornaments', 'advent calendars', 'snowflakes', 'tree toppers', 'gift tags'], boost: 95, tip: 'THE biggest season. Start listing in September. Ornaments are #1 seller.' },
  { event: 'Pet Memorial (ongoing)', month: 0, day: 0, products: ['memorial plaques', 'pet portraits', 'paw print keychains', 'photo frames'], boost: 60, tip: 'Evergreen demand. Always keep these listed. Empathetic descriptions convert.' },
];

@Injectable()
export class LaserTrendIntelligenceService {
  private readonly logger = new Logger(LaserTrendIntelligenceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aggregation: TrendAggregationService,
  ) {}

  // ─── Full Scan ────────────────────────────────────────────────────────────

  async runFullScan(userId: string, scanType = 'full'): Promise<any> {
    const scan = await this.prisma.trendScan.create({
      data: { userId, scanType, status: 'SCANNING' },
    });

    const startMs = Date.now();

    try {
      await this.prisma.trendScan.update({ where: { id: scan.id }, data: { status: 'SCANNING' } });

      const { signals, sourceBreakdown } = await this.aggregation.aggregateAll();

      await this.prisma.trendScan.update({ where: { id: scan.id }, data: { status: 'ANALYZING' } });

      const opportunities = this.interpretSignals(signals);
      const styleTrends = this.detectStyleTrends(signals);
      const seasonalForecast = this.generateSeasonalForecast();
      const opportunityRadar = opportunities.filter(o => o.isGapOpportunity);
      const priceInsights = this.generatePriceInsights(opportunities);

      // Persist opportunities
      for (const opp of opportunities) {
        await this.prisma.trendOpportunity.create({
          data: {
            scanId: scan.id,
            title: opp.title,
            description: opp.description,
            category: opp.category as any,
            sources: opp.sources as any[],
            keywords: opp.keywords,
            trendStrength: opp.trendStrength,
            growthVelocity: opp.growthVelocity,
            competitionDensity: opp.competitionDensity,
            profitPotential: opp.profitPotential,
            seasonalityScore: opp.seasonalityScore,
            overallScore: opp.overallScore,
            productIdeas: opp.productIdeas as any,
            recommendedSizes: opp.recommendedSizes as any,
            materialSuggestions: opp.materialSuggestions,
            styleHints: opp.styleHints,
            priceRange: opp.priceRange as any,
            peakMonths: opp.peakMonths,
            daysUntilPeak: opp.daysUntilPeak,
            isGapOpportunity: opp.isGapOpportunity,
            demandLevel: opp.demandLevel,
            supplyLevel: opp.supplyLevel,
            gapDescription: opp.gapDescription,
          },
        });
      }

      const durationMs = Date.now() - startMs;

      const updated = await this.prisma.trendScan.update({
        where: { id: scan.id },
        data: {
          status: 'COMPLETE',
          trendingProducts: opportunities.slice(0, 20) as any,
          styleTrends: styleTrends as any,
          seasonalForecast: seasonalForecast as any,
          opportunityRadar: opportunityRadar as any,
          priceInsights: priceInsights as any,
          sourceBreakdown: sourceBreakdown as any,
          totalSignalsScanned: signals.length,
          totalTrendsFound: opportunities.length,
          scanDurationMs: durationMs,
          aiModel: 'laser-trend-v1',
        },
        include: { opportunities: { orderBy: { overallScore: 'desc' }, take: 20 } },
      });

      return updated;
    } catch (err: any) {
      await this.prisma.trendScan.update({
        where: { id: scan.id },
        data: { status: 'FAILED', errorMessage: err.message, scanDurationMs: Date.now() - startMs },
      });
      throw err;
    }
  }

  // ─── Get latest scan ─────────────────────────────────────────────────────

  async getLatestScan(userId: string) {
    return this.prisma.trendScan.findFirst({
      where: { userId, status: 'COMPLETE' },
      orderBy: { createdAt: 'desc' },
      include: { opportunities: { orderBy: { overallScore: 'desc' }, take: 20 } },
    });
  }

  async getScanHistory(userId: string, take = 10) {
    return this.prisma.trendScan.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take,
      select: { id: true, scanType: true, status: true, totalTrendsFound: true, scanDurationMs: true, createdAt: true },
    });
  }

  // ─── Interpret signals into opportunities ─────────────────────────────────

  private interpretSignals(signals: AggregatedSignal[]): TrendOpportunityDto[] {
    const opportunities: TrendOpportunityDto[] = [];

    for (const sig of signals) {
      const kw = sig.keyword.toLowerCase();
      const category = this.classifyCategory(kw);
      const productIdeas = this.findProductIdeas(kw);
      const seasonality = this.assessSeasonality(kw);
      const competition = this.assessCompetition(sig);
      const profitPotential = this.assessProfit(sig, productIdeas);

      const trendStrength = Math.min(100, Math.round(sig.avgVolume * 0.6 + sig.sources.length * 8));
      const growthVelocity = Math.min(100, Math.round(sig.avgVelocity));
      const competitionDensity = competition;
      const seasonalityScore = seasonality.score;
      const overallScore = Math.round(
        trendStrength * 0.25 +
        growthVelocity * 0.25 +
        (100 - competitionDensity) * 0.2 +
        profitPotential * 0.2 +
        seasonalityScore * 0.1,
      );

      const isGap = sig.avgVolume > 55 && sig.listingCount < 500;
      const demandLevel = sig.avgVolume > 70 ? 'HIGH' : sig.avgVolume > 45 ? 'MEDIUM' : 'LOW';
      const supplyLevel = sig.listingCount > 2000 ? 'HIGH' : sig.listingCount > 800 ? 'MEDIUM' : 'LOW';

      opportunities.push({
        title: this.titleCase(sig.keyword),
        description: this.generateDescription(sig, category),
        category,
        sources: sig.sources,
        keywords: [sig.keyword, ...this.relatedKeywords(kw)],
        trendStrength,
        growthVelocity,
        competitionDensity,
        profitPotential,
        seasonalityScore,
        overallScore,
        productIdeas,
        recommendedSizes: this.defaultSizes(category),
        materialSuggestions: this.suggestMaterials(kw),
        styleHints: this.suggestStyles(kw),
        priceRange: this.estimatePriceRange(sig, productIdeas),
        peakMonths: seasonality.months,
        daysUntilPeak: seasonality.daysUntil,
        isGapOpportunity: isGap,
        demandLevel,
        supplyLevel,
        gapDescription: isGap ? `High demand (${demandLevel}) but low supply (${supplyLevel}) — only ~${sig.listingCount} listings found.` : null,
      });
    }

    return opportunities.sort((a, b) => b.overallScore - a.overallScore);
  }

  // ─── Style trends ────────────────────────────────────────────────────────

  private detectStyleTrends(signals: AggregatedSignal[]): StyleTrend[] {
    return STYLE_TRENDS_DB.map(style => {
      const matchingSignals = signals.filter(s =>
        style.keywords.some(k => s.keyword.toLowerCase().includes(k)),
      );
      const boost = matchingSignals.length * 3;
      return { ...style, strength: Math.min(100, style.strength + boost) };
    }).sort((a, b) => b.strength - a.strength);
  }

  // ─── Seasonal forecast ───────────────────────────────────────────────────

  private generateSeasonalForecast(): SeasonalForecast[] {
    const now = new Date();
    const forecasts: SeasonalForecast[] = [];

    for (const ev of SEASONAL_EVENTS) {
      if (ev.month === 0) {
        forecasts.push({
          event: ev.event,
          peakDate: 'Year-round',
          daysUntil: 0,
          relevantProducts: ev.products,
          expectedDemandBoost: ev.boost,
          preparationTip: ev.tip,
        });
        continue;
      }

      let peakDate = new Date(now.getFullYear(), ev.month - 1, ev.day);
      if (peakDate < now) peakDate = new Date(now.getFullYear() + 1, ev.month - 1, ev.day);
      const daysUntil = Math.ceil((peakDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntil <= 120) {
        forecasts.push({
          event: ev.event,
          peakDate: peakDate.toISOString().split('T')[0],
          daysUntil,
          relevantProducts: ev.products,
          expectedDemandBoost: ev.boost,
          preparationTip: ev.tip,
        });
      }
    }

    return forecasts.sort((a, b) => a.daysUntil - b.daysUntil);
  }

  // ─── Price insights ──────────────────────────────────────────────────────

  private generatePriceInsights(opportunities: TrendOpportunityDto[]) {
    const byCategory: Record<string, { prices: number[]; margins: number[] }> = {};
    for (const opp of opportunities) {
      if (!byCategory[opp.category]) byCategory[opp.category] = { prices: [], margins: [] };
      if (opp.priceRange) {
        byCategory[opp.category].prices.push(opp.priceRange.mid);
      }
      for (const idea of opp.productIdeas) {
        const margin = ((idea.suggestedPrice - idea.materialCost) / idea.suggestedPrice) * 100;
        byCategory[opp.category].margins.push(margin);
      }
    }

    return Object.entries(byCategory).map(([category, data]) => ({
      category,
      avgPrice: data.prices.length ? +(data.prices.reduce((a, b) => a + b, 0) / data.prices.length).toFixed(2) : null,
      avgMargin: data.margins.length ? +((data.margins.reduce((a, b) => a + b, 0) / data.margins.length)).toFixed(1) : null,
      priceCount: data.prices.length,
    }));
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private classifyCategory(kw: string): string {
    if (/ornament|christmas|halloween|valentine|easter|holiday/.test(kw)) return 'SEASONAL';
    if (/mandala|geometric|minimalist|boho|rustic|farmhouse|modern/.test(kw)) return 'DESIGN_THEME';
    if (/engrav|etch|mark|burn/.test(kw)) return 'ENGRAVING_STYLE';
    if (/acrylic|wood|bamboo|leather|metal|plywood/.test(kw)) return 'MATERIAL';
    if (/niche|gap|underserved/.test(kw)) return 'NICHE';
    return 'PRODUCT_TYPE';
  }

  private findProductIdeas(kw: string): ProductIdea[] {
    for (const [key, ideas] of Object.entries(PRODUCT_IDEAS_DB)) {
      if (kw.includes(key)) return ideas;
    }
    // Generic fallback
    return [
      { name: `Custom ${this.titleCase(kw)}`, type: 'custom', difficulty: 'medium', estimatedTimeMins: 20, materialCost: 5.00, suggestedPrice: 35.00 },
      { name: `${this.titleCase(kw)} Keychain`, type: 'keychain', difficulty: 'easy', estimatedTimeMins: 5, materialCost: 1.20, suggestedPrice: 14.99 },
    ];
  }

  private assessSeasonality(kw: string): { score: number; months: number[]; daysUntil: number | null } {
    for (const ev of SEASONAL_EVENTS) {
      if (ev.products.some(p => kw.includes(p.split(' ')[0].toLowerCase())) ||
          kw.includes(ev.event.toLowerCase().split(' ')[0].toLowerCase())) {
        const now = new Date();
        let peak = ev.month === 0 ? now : new Date(now.getFullYear(), ev.month - 1, ev.day);
        if (peak < now && ev.month !== 0) peak = new Date(now.getFullYear() + 1, ev.month - 1, ev.day);
        const daysUntil = ev.month === 0 ? null : Math.ceil((peak.getTime() - now.getTime()) / 86400000);
        return { score: ev.boost, months: ev.month === 0 ? [1,2,3,4,5,6,7,8,9,10,11,12] : [ev.month], daysUntil };
      }
    }
    return { score: 30, months: [], daysUntil: null };
  }

  private assessCompetition(sig: AggregatedSignal): number {
    if (sig.listingCount > 3000) return 85;
    if (sig.listingCount > 1500) return 70;
    if (sig.listingCount > 800) return 55;
    if (sig.listingCount > 300) return 40;
    return 20;
  }

  private assessProfit(sig: AggregatedSignal, ideas: ProductIdea[]): number {
    if (ideas.length === 0) return 50;
    const avgMargin = ideas.reduce((acc, i) => acc + ((i.suggestedPrice - i.materialCost) / i.suggestedPrice), 0) / ideas.length;
    return Math.min(100, Math.round(avgMargin * 120));
  }

  private estimatePriceRange(sig: AggregatedSignal, ideas: ProductIdea[]) {
    const base = sig.avgPrice || (ideas.length > 0 ? ideas[0].suggestedPrice : 25);
    return { low: +(base * 0.6).toFixed(2), mid: +base.toFixed(2), high: +(base * 1.5).toFixed(2), premium: +(base * 2.2).toFixed(2) };
  }

  private suggestMaterials(kw: string): string[] {
    if (/acrylic|led|glow|night light|neon/.test(kw)) return ['acrylic-clear', 'acrylic-frosted', 'acrylic-colored'];
    if (/leather/.test(kw)) return ['leather-veg-tan', 'leather-bonded'];
    if (/metal/.test(kw)) return ['anodized-aluminum', 'stainless-steel'];
    return ['plywood-3mm', 'plywood-6mm', 'bamboo', 'mdf-3mm'];
  }

  private suggestStyles(kw: string): string[] {
    const styles: string[] = [];
    if (/mandala|layered/.test(kw)) styles.push('layered', 'intricate');
    if (/minimalist|clean|simple/.test(kw)) styles.push('minimalist', 'line-art');
    if (/rustic|farmhouse|country/.test(kw)) styles.push('rustic', 'vintage');
    if (/geometric|modern|abstract/.test(kw)) styles.push('geometric', 'modern');
    if (/boho|botanical/.test(kw)) styles.push('boho', 'organic');
    if (styles.length === 0) styles.push('versatile', 'customizable');
    return styles;
  }

  private defaultSizes(category: string): SizeRec[] {
    return [
      { label: 'Small', widthMm: 100, heightMm: 100 },
      { label: 'Medium', widthMm: 200, heightMm: 200 },
      { label: 'Large', widthMm: 300, heightMm: 300 },
      { label: 'XL', widthMm: 400, heightMm: 400 },
    ];
  }

  private relatedKeywords(kw: string): string[] {
    const words = kw.split(/\s+/);
    return words.length > 1 ? words.filter(w => w.length > 3) : [];
  }

  private titleCase(s: string): string {
    return s.replace(/\b\w/g, c => c.toUpperCase());
  }

  private generateDescription(sig: AggregatedSignal, category: string): string {
    const sourceList = sig.sources.join(', ');
    const vol = sig.avgVolume > 70 ? 'high' : sig.avgVolume > 45 ? 'moderate' : 'emerging';
    return `${vol.charAt(0).toUpperCase() + vol.slice(1)} demand detected across ${sourceList}. ` +
      `Growth velocity: ${Math.round(sig.avgVelocity)}%. ` +
      (sig.avgPrice ? `Average market price: $${sig.avgPrice.toFixed(2)}. ` : '') +
      `Category: ${category.replace('_', ' ').toLowerCase()}.`;
  }
}
