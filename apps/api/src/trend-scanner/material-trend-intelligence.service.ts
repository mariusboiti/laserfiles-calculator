import { Injectable, Logger } from '@nestjs/common';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface MaterialTrend {
  materialId: string;
  materialName: string;
  category: 'wood' | 'acrylic' | 'leather' | 'stone' | 'composite' | 'metal';
  popularityScore: number;         // 0-100
  growthRate: number;              // % change
  trendDirection: 'rising' | 'stable' | 'declining';
  topProducts: string[];
  priceStability: 'stable' | 'moderate' | 'volatile';
  supplyStatus: 'abundant' | 'normal' | 'limited' | 'shortage';
  seasonalDemand: Array<{ month: string; demandLevel: number }>;
  sustainabilityScore: number;     // 0-100
  recommendation: string;
}

export interface MaterialComparison {
  materials: MaterialTrend[];
  bestValuePick: string;
  trendingPick: string;
  premiumPick: string;
  sustainablePick: string;
}

// ─── Material intelligence database ─────────────────────────────────────────

const MATERIAL_DATA: Omit<MaterialTrend, 'recommendation'>[] = [
  {
    materialId: 'plywood-birch',
    materialName: 'Baltic Birch Plywood',
    category: 'wood',
    popularityScore: 92,
    growthRate: 3.2,
    trendDirection: 'rising',
    topProducts: ['wall art', 'signs', 'ornaments', 'coasters', 'keychains', 'boxes'],
    priceStability: 'stable',
    supplyStatus: 'abundant',
    seasonalDemand: [
      { month: 'Jan', demandLevel: 55 }, { month: 'Feb', demandLevel: 50 }, { month: 'Mar', demandLevel: 60 },
      { month: 'Apr', demandLevel: 65 }, { month: 'May', demandLevel: 70 }, { month: 'Jun', demandLevel: 65 },
      { month: 'Jul', demandLevel: 60 }, { month: 'Aug', demandLevel: 65 }, { month: 'Sep', demandLevel: 75 },
      { month: 'Oct', demandLevel: 85 }, { month: 'Nov', demandLevel: 95 }, { month: 'Dec', demandLevel: 90 },
    ],
    sustainabilityScore: 75,
  },
  {
    materialId: 'walnut',
    materialName: 'Walnut Hardwood',
    category: 'wood',
    popularityScore: 78,
    growthRate: 8.5,
    trendDirection: 'rising',
    topProducts: ['premium signs', 'cutting boards', 'jewelry boxes', 'awards', 'desk accessories'],
    priceStability: 'moderate',
    supplyStatus: 'normal',
    seasonalDemand: [
      { month: 'Jan', demandLevel: 50 }, { month: 'Feb', demandLevel: 55 }, { month: 'Mar', demandLevel: 55 },
      { month: 'Apr', demandLevel: 60 }, { month: 'May', demandLevel: 65 }, { month: 'Jun', demandLevel: 60 },
      { month: 'Jul', demandLevel: 55 }, { month: 'Aug', demandLevel: 60 }, { month: 'Sep', demandLevel: 70 },
      { month: 'Oct', demandLevel: 80 }, { month: 'Nov', demandLevel: 90 }, { month: 'Dec', demandLevel: 85 },
    ],
    sustainabilityScore: 65,
  },
  {
    materialId: 'bamboo',
    materialName: 'Bamboo',
    category: 'wood',
    popularityScore: 72,
    growthRate: 12.3,
    trendDirection: 'rising',
    topProducts: ['coasters', 'cutting boards', 'phone stands', 'business cards', 'eco gifts'],
    priceStability: 'stable',
    supplyStatus: 'abundant',
    seasonalDemand: [
      { month: 'Jan', demandLevel: 55 }, { month: 'Feb', demandLevel: 55 }, { month: 'Mar', demandLevel: 65 },
      { month: 'Apr', demandLevel: 75 }, { month: 'May', demandLevel: 70 }, { month: 'Jun', demandLevel: 65 },
      { month: 'Jul', demandLevel: 60 }, { month: 'Aug', demandLevel: 60 }, { month: 'Sep', demandLevel: 65 },
      { month: 'Oct', demandLevel: 70 }, { month: 'Nov', demandLevel: 80 }, { month: 'Dec', demandLevel: 75 },
    ],
    sustainabilityScore: 95,
  },
  {
    materialId: 'acrylic-clear',
    materialName: 'Clear Acrylic',
    category: 'acrylic',
    popularityScore: 85,
    growthRate: 6.1,
    trendDirection: 'rising',
    topProducts: ['night lights', 'cake toppers', 'earrings', 'keychains', 'table numbers', 'ornaments'],
    priceStability: 'moderate',
    supplyStatus: 'abundant',
    seasonalDemand: [
      { month: 'Jan', demandLevel: 50 }, { month: 'Feb', demandLevel: 65 }, { month: 'Mar', demandLevel: 60 },
      { month: 'Apr', demandLevel: 65 }, { month: 'May', demandLevel: 75 }, { month: 'Jun', demandLevel: 80 },
      { month: 'Jul', demandLevel: 70 }, { month: 'Aug', demandLevel: 65 }, { month: 'Sep', demandLevel: 75 },
      { month: 'Oct', demandLevel: 80 }, { month: 'Nov', demandLevel: 90 }, { month: 'Dec', demandLevel: 85 },
    ],
    sustainabilityScore: 30,
  },
  {
    materialId: 'acrylic-mirror',
    materialName: 'Mirror Acrylic (Gold/Silver)',
    category: 'acrylic',
    popularityScore: 68,
    growthRate: 15.2,
    trendDirection: 'rising',
    topProducts: ['cake toppers', 'wedding signs', 'wall decor', 'jewelry', 'luxury gifts'],
    priceStability: 'volatile',
    supplyStatus: 'limited',
    seasonalDemand: [
      { month: 'Jan', demandLevel: 40 }, { month: 'Feb', demandLevel: 60 }, { month: 'Mar', demandLevel: 55 },
      { month: 'Apr', demandLevel: 65 }, { month: 'May', demandLevel: 75 }, { month: 'Jun', demandLevel: 80 },
      { month: 'Jul', demandLevel: 65 }, { month: 'Aug', demandLevel: 60 }, { month: 'Sep', demandLevel: 70 },
      { month: 'Oct', demandLevel: 75 }, { month: 'Nov', demandLevel: 85 }, { month: 'Dec', demandLevel: 80 },
    ],
    sustainabilityScore: 25,
  },
  {
    materialId: 'leather',
    materialName: 'Vegetable-Tanned Leather',
    category: 'leather',
    popularityScore: 65,
    growthRate: 9.8,
    trendDirection: 'rising',
    topProducts: ['patches', 'keychains', 'bookmarks', 'journal covers', 'coasters', 'bracelets'],
    priceStability: 'volatile',
    supplyStatus: 'normal',
    seasonalDemand: [
      { month: 'Jan', demandLevel: 45 }, { month: 'Feb', demandLevel: 55 }, { month: 'Mar', demandLevel: 55 },
      { month: 'Apr', demandLevel: 60 }, { month: 'May', demandLevel: 65 }, { month: 'Jun', demandLevel: 70 },
      { month: 'Jul', demandLevel: 60 }, { month: 'Aug', demandLevel: 55 }, { month: 'Sep', demandLevel: 65 },
      { month: 'Oct', demandLevel: 75 }, { month: 'Nov', demandLevel: 85 }, { month: 'Dec', demandLevel: 80 },
    ],
    sustainabilityScore: 50,
  },
  {
    materialId: 'slate',
    materialName: 'Natural Slate',
    category: 'stone',
    popularityScore: 58,
    growthRate: 11.4,
    trendDirection: 'rising',
    topProducts: ['coasters', 'cheese boards', 'house signs', 'memorial plaques', 'photo frames'],
    priceStability: 'stable',
    supplyStatus: 'normal',
    seasonalDemand: [
      { month: 'Jan', demandLevel: 40 }, { month: 'Feb', demandLevel: 45 }, { month: 'Mar', demandLevel: 50 },
      { month: 'Apr', demandLevel: 55 }, { month: 'May', demandLevel: 60 }, { month: 'Jun', demandLevel: 65 },
      { month: 'Jul', demandLevel: 60 }, { month: 'Aug', demandLevel: 55 }, { month: 'Sep', demandLevel: 65 },
      { month: 'Oct', demandLevel: 70 }, { month: 'Nov', demandLevel: 80 }, { month: 'Dec', demandLevel: 75 },
    ],
    sustainabilityScore: 80,
  },
  {
    materialId: 'mdf',
    materialName: 'MDF (Medium Density Fiberboard)',
    category: 'composite',
    popularityScore: 70,
    growthRate: -1.5,
    trendDirection: 'stable',
    topProducts: ['layered art', 'stencils', 'templates', 'signs', 'decorative panels'],
    priceStability: 'stable',
    supplyStatus: 'abundant',
    seasonalDemand: [
      { month: 'Jan', demandLevel: 55 }, { month: 'Feb', demandLevel: 55 }, { month: 'Mar', demandLevel: 60 },
      { month: 'Apr', demandLevel: 60 }, { month: 'May', demandLevel: 60 }, { month: 'Jun', demandLevel: 55 },
      { month: 'Jul', demandLevel: 55 }, { month: 'Aug', demandLevel: 60 }, { month: 'Sep', demandLevel: 65 },
      { month: 'Oct', demandLevel: 75 }, { month: 'Nov', demandLevel: 85 }, { month: 'Dec', demandLevel: 80 },
    ],
    sustainabilityScore: 45,
  },
  {
    materialId: 'cork',
    materialName: 'Cork Sheet',
    category: 'composite',
    popularityScore: 45,
    growthRate: 18.7,
    trendDirection: 'rising',
    topProducts: ['coasters', 'bulletin boards', 'trivets', 'wall tiles', 'eco packaging'],
    priceStability: 'moderate',
    supplyStatus: 'limited',
    seasonalDemand: [
      { month: 'Jan', demandLevel: 40 }, { month: 'Feb', demandLevel: 40 }, { month: 'Mar', demandLevel: 50 },
      { month: 'Apr', demandLevel: 60 }, { month: 'May', demandLevel: 55 }, { month: 'Jun', demandLevel: 50 },
      { month: 'Jul', demandLevel: 45 }, { month: 'Aug', demandLevel: 50 }, { month: 'Sep', demandLevel: 55 },
      { month: 'Oct', demandLevel: 60 }, { month: 'Nov', demandLevel: 70 }, { month: 'Dec', demandLevel: 65 },
    ],
    sustainabilityScore: 92,
  },
  {
    materialId: 'basswood',
    materialName: 'Basswood / Linden',
    category: 'wood',
    popularityScore: 60,
    growthRate: 4.2,
    trendDirection: 'stable',
    topProducts: ['model kits', 'ornaments', 'fine detail work', 'miniatures', 'layered art'],
    priceStability: 'stable',
    supplyStatus: 'abundant',
    seasonalDemand: [
      { month: 'Jan', demandLevel: 50 }, { month: 'Feb', demandLevel: 50 }, { month: 'Mar', demandLevel: 55 },
      { month: 'Apr', demandLevel: 60 }, { month: 'May', demandLevel: 60 }, { month: 'Jun', demandLevel: 55 },
      { month: 'Jul', demandLevel: 55 }, { month: 'Aug', demandLevel: 60 }, { month: 'Sep', demandLevel: 65 },
      { month: 'Oct', demandLevel: 75 }, { month: 'Nov', demandLevel: 85 }, { month: 'Dec', demandLevel: 80 },
    ],
    sustainabilityScore: 70,
  },
];

@Injectable()
export class MaterialTrendIntelligenceService {
  private readonly logger = new Logger(MaterialTrendIntelligenceService.name);

  getAllMaterialTrends(): MaterialTrend[] {
    return MATERIAL_DATA.map(m => ({
      ...m,
      recommendation: this.generateRecommendation(m),
    }));
  }

  getMaterialTrend(materialId: string): MaterialTrend | null {
    const data = MATERIAL_DATA.find(m => m.materialId === materialId);
    if (!data) return null;
    return { ...data, recommendation: this.generateRecommendation(data) };
  }

  getComparison(materialIds?: string[]): MaterialComparison {
    const materials = materialIds
      ? MATERIAL_DATA.filter(m => materialIds.includes(m.materialId)).map(m => ({ ...m, recommendation: this.generateRecommendation(m) }))
      : MATERIAL_DATA.map(m => ({ ...m, recommendation: this.generateRecommendation(m) }));

    // Best value: high popularity, stable price, abundant supply
    const bestValue = [...materials].sort((a, b) => {
      const scoreA = a.popularityScore * 0.3 + (a.priceStability === 'stable' ? 30 : 15) + (a.supplyStatus === 'abundant' ? 30 : 15);
      const scoreB = b.popularityScore * 0.3 + (b.priceStability === 'stable' ? 30 : 15) + (b.supplyStatus === 'abundant' ? 30 : 15);
      return scoreB - scoreA;
    })[0];

    // Trending: highest growth rate
    const trending = [...materials].sort((a, b) => b.growthRate - a.growthRate)[0];

    // Premium: highest popularity + moderate/volatile price (premium materials)
    const premium = [...materials].sort((a, b) => {
      const scoreA = a.popularityScore + (a.priceStability !== 'stable' ? 20 : 0);
      const scoreB = b.popularityScore + (b.priceStability !== 'stable' ? 20 : 0);
      return scoreB - scoreA;
    })[0];

    // Sustainable: highest sustainability score
    const sustainable = [...materials].sort((a, b) => b.sustainabilityScore - a.sustainabilityScore)[0];

    return {
      materials,
      bestValuePick: bestValue?.materialName || 'N/A',
      trendingPick: trending?.materialName || 'N/A',
      premiumPick: premium?.materialName || 'N/A',
      sustainablePick: sustainable?.materialName || 'N/A',
    };
  }

  getSeasonalRecommendations(month?: number): Array<{ materialName: string; demandLevel: number; recommendation: string }> {
    const currentMonth = month ?? new Date().getMonth();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = monthNames[currentMonth];

    return MATERIAL_DATA
      .map(m => {
        const monthData = m.seasonalDemand.find(d => d.month === monthName);
        const demand = monthData?.demandLevel || 50;
        let rec: string;
        if (demand >= 80) rec = `High demand for ${m.materialName} this month. Stock up now.`;
        else if (demand >= 60) rec = `Good demand. Maintain normal inventory levels.`;
        else rec = `Lower demand period. Reduce orders or focus on other materials.`;
        return { materialName: m.materialName, demandLevel: demand, recommendation: rec };
      })
      .sort((a, b) => b.demandLevel - a.demandLevel);
  }

  private generateRecommendation(m: Omit<MaterialTrend, 'recommendation'>): string {
    if (m.growthRate > 10 && m.supplyStatus !== 'shortage') {
      return `${m.materialName} is trending strongly (+${m.growthRate.toFixed(1)}%). Consider stocking up before prices increase.`;
    }
    if (m.popularityScore > 80 && m.priceStability === 'stable') {
      return `${m.materialName} is a reliable staple. Consistent demand with stable pricing — ideal for core product lines.`;
    }
    if (m.sustainabilityScore > 85) {
      return `${m.materialName} is an eco-friendly choice gaining traction. Market it as sustainable to attract conscious buyers.`;
    }
    if (m.trendDirection === 'declining') {
      return `${m.materialName} demand is softening. Consider reducing inventory and pivoting to alternatives.`;
    }
    return `${m.materialName} shows steady demand. Good for diversifying your material portfolio.`;
  }
}
