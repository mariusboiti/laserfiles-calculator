import { Injectable, Logger } from '@nestjs/common';

// ─── Source signal shape ────────────────────────────────────────────────────
export interface RawSignal {
  source: string;       // ETSY | PINTEREST | REDDIT | etc.
  keyword: string;
  volume: number;       // relative search / mention volume 0-100
  velocity: number;     // growth rate 0-100
  sampleListings?: number;
  avgPrice?: number;
  sentiment?: number;   // -1 to 1
  timestamp: Date;
  meta?: Record<string, any>;
}

export interface AggregatedSignal {
  keyword: string;
  sources: string[];
  avgVolume: number;
  maxVolume: number;
  avgVelocity: number;
  listingCount: number;
  avgPrice: number | null;
  sentiment: number;
  signalCount: number;
}

// ─── Modular source adapters (stubs — real API integration later) ───────────
interface SourceAdapter {
  name: string;
  fetchSignals(categories: string[]): Promise<RawSignal[]>;
}

@Injectable()
export class TrendAggregationService {
  private readonly logger = new Logger(TrendAggregationService.name);
  private readonly adapters: SourceAdapter[] = [];

  constructor() {
    this.adapters = [
      this.etsyAdapter(),
      this.shopifyAdapter(),
      this.amazonHandmadeAdapter(),
      this.pinterestAdapter(),
      this.tiktokAdapter(),
      this.instagramAdapter(),
      this.redditAdapter(),
      this.makerForumAdapter(),
    ];
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  async aggregateAll(categories: string[] = []): Promise<{
    signals: AggregatedSignal[];
    raw: RawSignal[];
    sourceBreakdown: Record<string, number>;
  }> {
    const allRaw: RawSignal[] = [];
    const sourceBreakdown: Record<string, number> = {};

    const results = await Promise.allSettled(
      this.adapters.map(a => a.fetchSignals(categories)),
    );

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const name = this.adapters[i].name;
      if (r.status === 'fulfilled') {
        allRaw.push(...r.value);
        sourceBreakdown[name] = r.value.length;
        this.logger.log(`${name}: ${r.value.length} signals`);
      } else {
        sourceBreakdown[name] = 0;
        this.logger.warn(`${name} failed: ${r.reason}`);
      }
    }

    const signals = this.mergeSignals(allRaw);
    return { signals, raw: allRaw, sourceBreakdown };
  }

  // ─── Merge raw signals by keyword ────────────────────────────────────────

  private mergeSignals(raw: RawSignal[]): AggregatedSignal[] {
    const map = new Map<string, RawSignal[]>();
    for (const s of raw) {
      const key = s.keyword.toLowerCase().trim();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }

    const merged: AggregatedSignal[] = [];
    for (const [keyword, signals] of map.entries()) {
      const sources = [...new Set(signals.map(s => s.source))];
      const volumes = signals.map(s => s.volume);
      const velocities = signals.map(s => s.velocity);
      const prices = signals.filter(s => s.avgPrice != null).map(s => s.avgPrice!);
      const sentiments = signals.filter(s => s.sentiment != null).map(s => s.sentiment!);

      merged.push({
        keyword,
        sources,
        avgVolume: volumes.reduce((a, b) => a + b, 0) / volumes.length,
        maxVolume: Math.max(...volumes),
        avgVelocity: velocities.reduce((a, b) => a + b, 0) / velocities.length,
        listingCount: signals.reduce((a, s) => a + (s.sampleListings || 0), 0),
        avgPrice: prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : null,
        sentiment: sentiments.length > 0 ? sentiments.reduce((a, b) => a + b, 0) / sentiments.length : 0,
        signalCount: signals.length,
      });
    }

    return merged.sort((a, b) => b.avgVolume * b.sources.length - a.avgVolume * a.sources.length);
  }

  // ─── Source Adapters (simulated — real API keys plug in later) ────────────
  // Each returns laser-relevant trend signals. In production these call real
  // APIs; for now they return curated seed data so the UI is fully functional.

  private etsyAdapter(): SourceAdapter {
    return {
      name: 'ETSY',
      fetchSignals: async () => this.generateMarketplaceSignals('ETSY', [
        { keyword: 'pet memorial plaque', volume: 88, velocity: 72, listings: 1240, price: 34.99 },
        { keyword: 'custom cutting board', volume: 82, velocity: 45, listings: 3200, price: 42.00 },
        { keyword: 'layered mandala wall art', volume: 76, velocity: 81, listings: 680, price: 55.00 },
        { keyword: 'wedding guest book alternative', volume: 71, velocity: 38, listings: 1890, price: 48.00 },
        { keyword: 'personalized dog tag', volume: 69, velocity: 52, listings: 2100, price: 18.50 },
        { keyword: 'farmhouse sign laser', volume: 67, velocity: 30, listings: 4100, price: 28.00 },
        { keyword: 'acrylic night light', volume: 65, velocity: 78, listings: 520, price: 32.00 },
        { keyword: 'christmas ornament laser', volume: 91, velocity: 85, listings: 5600, price: 12.00 },
        { keyword: 'graduation gift engraved', volume: 73, velocity: 68, listings: 1100, price: 25.00 },
        { keyword: 'cat memorial gift', volume: 64, velocity: 70, listings: 380, price: 29.99 },
        { keyword: 'geometric wall clock', volume: 58, velocity: 55, listings: 450, price: 45.00 },
        { keyword: 'wooden map puzzle', volume: 54, velocity: 62, listings: 310, price: 38.00 },
      ]),
    };
  }

  private shopifyAdapter(): SourceAdapter {
    return {
      name: 'SHOPIFY',
      fetchSignals: async () => this.generateMarketplaceSignals('SHOPIFY', [
        { keyword: 'personalized jewelry box', volume: 72, velocity: 48, listings: 890, price: 52.00 },
        { keyword: 'custom laptop stand', volume: 61, velocity: 65, listings: 340, price: 45.00 },
        { keyword: 'engraved whiskey glass set', volume: 68, velocity: 42, listings: 720, price: 38.00 },
        { keyword: 'layered 3d art', volume: 70, velocity: 74, listings: 280, price: 65.00 },
        { keyword: 'wooden phone case', volume: 55, velocity: 35, listings: 610, price: 28.00 },
        { keyword: 'acrylic cake topper', volume: 77, velocity: 60, listings: 1500, price: 15.00 },
      ]),
    };
  }

  private amazonHandmadeAdapter(): SourceAdapter {
    return {
      name: 'AMAZON_HANDMADE',
      fetchSignals: async () => this.generateMarketplaceSignals('AMAZON_HANDMADE', [
        { keyword: 'custom cutting board', volume: 79, velocity: 40, listings: 2800, price: 39.99 },
        { keyword: 'engraved pen set', volume: 62, velocity: 35, listings: 1200, price: 24.00 },
        { keyword: 'pet memorial plaque', volume: 74, velocity: 65, listings: 600, price: 32.00 },
        { keyword: 'personalized coasters', volume: 66, velocity: 44, listings: 1800, price: 22.00 },
        { keyword: 'wooden bookmark', volume: 58, velocity: 50, listings: 900, price: 12.00 },
      ]),
    };
  }

  private pinterestAdapter(): SourceAdapter {
    return {
      name: 'PINTEREST',
      fetchSignals: async () => this.generateSocialSignals('PINTEREST', [
        { keyword: 'mandala laser art', volume: 85, velocity: 78, sentiment: 0.9 },
        { keyword: 'minimalist wall decor', volume: 80, velocity: 55, sentiment: 0.85 },
        { keyword: 'layered shadow box', volume: 74, velocity: 82, sentiment: 0.88 },
        { keyword: 'geometric animal art', volume: 71, velocity: 70, sentiment: 0.82 },
        { keyword: 'rustic farmhouse sign', volume: 68, velocity: 32, sentiment: 0.75 },
        { keyword: 'boho wall hanging laser', volume: 63, velocity: 72, sentiment: 0.8 },
        { keyword: 'acrylic led lamp', volume: 60, velocity: 80, sentiment: 0.87 },
      ]),
    };
  }

  private tiktokAdapter(): SourceAdapter {
    return {
      name: 'TIKTOK',
      fetchSignals: async () => this.generateSocialSignals('TIKTOK', [
        { keyword: 'laser cutting satisfying', volume: 92, velocity: 88, sentiment: 0.95 },
        { keyword: 'layered mandala lamp', volume: 78, velocity: 90, sentiment: 0.92 },
        { keyword: 'acrylic night light diy', volume: 75, velocity: 85, sentiment: 0.88 },
        { keyword: 'pet portrait laser', volume: 70, velocity: 76, sentiment: 0.9 },
        { keyword: 'custom neon sign alternative', volume: 66, velocity: 72, sentiment: 0.82 },
        { keyword: 'wooden puzzle gift', volume: 62, velocity: 68, sentiment: 0.85 },
      ]),
    };
  }

  private instagramAdapter(): SourceAdapter {
    return {
      name: 'INSTAGRAM',
      fetchSignals: async () => this.generateSocialSignals('INSTAGRAM', [
        { keyword: 'laser engraving art', volume: 82, velocity: 50, sentiment: 0.88 },
        { keyword: 'mandala wall art', volume: 76, velocity: 60, sentiment: 0.9 },
        { keyword: 'personalized gift laser', volume: 72, velocity: 55, sentiment: 0.85 },
        { keyword: 'geometric home decor', volume: 65, velocity: 48, sentiment: 0.8 },
        { keyword: 'wooden earrings laser', volume: 60, velocity: 65, sentiment: 0.82 },
      ]),
    };
  }

  private redditAdapter(): SourceAdapter {
    return {
      name: 'REDDIT',
      fetchSignals: async () => this.generateSocialSignals('REDDIT', [
        { keyword: 'best laser projects sell', volume: 70, velocity: 55, sentiment: 0.7 },
        { keyword: 'pet memorial ideas', volume: 65, velocity: 62, sentiment: 0.85 },
        { keyword: 'layered art files', volume: 60, velocity: 58, sentiment: 0.75 },
        { keyword: 'laser business profitable', volume: 58, velocity: 45, sentiment: 0.65 },
        { keyword: 'acrylic projects beginner', volume: 55, velocity: 50, sentiment: 0.72 },
      ]),
    };
  }

  private makerForumAdapter(): SourceAdapter {
    return {
      name: 'MAKER_FORUM',
      fetchSignals: async () => this.generateSocialSignals('MAKER_FORUM', [
        { keyword: 'living hinge box', volume: 55, velocity: 40, sentiment: 0.78 },
        { keyword: 'topographic map laser', volume: 52, velocity: 58, sentiment: 0.82 },
        { keyword: 'lithophane lamp', volume: 48, velocity: 65, sentiment: 0.85 },
        { keyword: 'snap fit enclosure', volume: 45, velocity: 42, sentiment: 0.7 },
      ]),
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private generateMarketplaceSignals(
    source: string,
    data: Array<{ keyword: string; volume: number; velocity: number; listings: number; price: number }>,
  ): RawSignal[] {
    return data.map(d => ({
      source,
      keyword: d.keyword,
      volume: d.volume + Math.round((Math.random() - 0.5) * 6),
      velocity: d.velocity + Math.round((Math.random() - 0.5) * 8),
      sampleListings: d.listings + Math.round((Math.random() - 0.5) * d.listings * 0.1),
      avgPrice: +(d.price * (0.9 + Math.random() * 0.2)).toFixed(2),
      sentiment: 0.7 + Math.random() * 0.25,
      timestamp: new Date(),
    }));
  }

  private generateSocialSignals(
    source: string,
    data: Array<{ keyword: string; volume: number; velocity: number; sentiment: number }>,
  ): RawSignal[] {
    return data.map(d => ({
      source,
      keyword: d.keyword,
      volume: d.volume + Math.round((Math.random() - 0.5) * 6),
      velocity: d.velocity + Math.round((Math.random() - 0.5) * 8),
      sentiment: Math.min(1, Math.max(-1, d.sentiment + (Math.random() - 0.5) * 0.1)),
      timestamp: new Date(),
    }));
  }
}
