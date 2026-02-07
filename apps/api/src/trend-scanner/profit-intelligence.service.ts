import { Injectable, Logger } from '@nestjs/common';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ProfitAnalysis {
  productType: string;
  materialCost: number;
  machineTimeCost: number;
  laborCost: number;
  overheadCost: number;
  totalCost: number;
  recommendedPriceRange: { min: number; max: number };
  profitScore: number;          // 0-100
  marginPercent: number;
  riskLevel: 'low' | 'medium' | 'high';
  riskFactors: string[];
  competitionSaturation: number; // 0-100
  demandStrength: number;        // 0-100
  breakEvenUnits: number;
  monthlyPotentialRevenue: number;
  scalabilityScore: number;      // 0-100
}

export interface MaterialCostProfile {
  materialId: string;
  name: string;
  costPerSheet: number;
  sheetSizeMm: { width: number; height: number };
  costPerSqCm: number;
  availability: 'high' | 'medium' | 'low';
  priceVolatility: 'stable' | 'moderate' | 'volatile';
}

// ─── Material cost database ─────────────────────────────────────────────────

const MATERIAL_COSTS: MaterialCostProfile[] = [
  { materialId: 'plywood-3mm', name: 'Plywood 3mm', costPerSheet: 8.00, sheetSizeMm: { width: 600, height: 400 }, costPerSqCm: 0.0033, availability: 'high', priceVolatility: 'stable' },
  { materialId: 'plywood-6mm', name: 'Plywood 6mm', costPerSheet: 12.00, sheetSizeMm: { width: 600, height: 400 }, costPerSqCm: 0.0050, availability: 'high', priceVolatility: 'stable' },
  { materialId: 'mdf-3mm', name: 'MDF 3mm', costPerSheet: 5.00, sheetSizeMm: { width: 600, height: 400 }, costPerSqCm: 0.0021, availability: 'high', priceVolatility: 'stable' },
  { materialId: 'bamboo', name: 'Bamboo 3mm', costPerSheet: 14.00, sheetSizeMm: { width: 600, height: 400 }, costPerSqCm: 0.0058, availability: 'medium', priceVolatility: 'moderate' },
  { materialId: 'walnut', name: 'Walnut 6mm', costPerSheet: 25.00, sheetSizeMm: { width: 300, height: 300 }, costPerSqCm: 0.0278, availability: 'medium', priceVolatility: 'moderate' },
  { materialId: 'acrylic-clear', name: 'Acrylic Clear 3mm', costPerSheet: 10.00, sheetSizeMm: { width: 600, height: 400 }, costPerSqCm: 0.0042, availability: 'high', priceVolatility: 'moderate' },
  { materialId: 'acrylic-colored', name: 'Acrylic Colored 3mm', costPerSheet: 14.00, sheetSizeMm: { width: 600, height: 400 }, costPerSqCm: 0.0058, availability: 'medium', priceVolatility: 'moderate' },
  { materialId: 'acrylic-black', name: 'Acrylic Black 3mm', costPerSheet: 12.00, sheetSizeMm: { width: 600, height: 400 }, costPerSqCm: 0.0050, availability: 'high', priceVolatility: 'stable' },
  { materialId: 'acrylic-gold', name: 'Acrylic Gold Mirror 3mm', costPerSheet: 18.00, sheetSizeMm: { width: 600, height: 400 }, costPerSqCm: 0.0075, availability: 'low', priceVolatility: 'volatile' },
  { materialId: 'acrylic-frosted', name: 'Acrylic Frosted 3mm', costPerSheet: 13.00, sheetSizeMm: { width: 600, height: 400 }, costPerSqCm: 0.0054, availability: 'medium', priceVolatility: 'moderate' },
  { materialId: 'leather', name: 'Leather Sheet 2mm', costPerSheet: 20.00, sheetSizeMm: { width: 300, height: 300 }, costPerSqCm: 0.0222, availability: 'medium', priceVolatility: 'volatile' },
  { materialId: 'cork-backed', name: 'Cork-backed 3mm', costPerSheet: 10.00, sheetSizeMm: { width: 300, height: 300 }, costPerSqCm: 0.0111, availability: 'medium', priceVolatility: 'stable' },
  { materialId: 'slate', name: 'Slate Tile 5mm', costPerSheet: 6.00, sheetSizeMm: { width: 200, height: 200 }, costPerSqCm: 0.0150, availability: 'medium', priceVolatility: 'stable' },
  { materialId: 'basswood-3mm', name: 'Basswood 3mm', costPerSheet: 9.00, sheetSizeMm: { width: 600, height: 400 }, costPerSqCm: 0.0038, availability: 'high', priceVolatility: 'stable' },
  { materialId: 'pine', name: 'Pine 6mm', costPerSheet: 7.00, sheetSizeMm: { width: 600, height: 400 }, costPerSqCm: 0.0029, availability: 'high', priceVolatility: 'stable' },
];

// Machine cost per minute (average CO2 laser including electricity, maintenance, depreciation)
const MACHINE_COST_PER_MIN = 0.12;
const LABOR_COST_PER_MIN = 0.35;
const OVERHEAD_MULTIPLIER = 1.15; // 15% overhead

@Injectable()
export class ProfitIntelligenceService {
  private readonly logger = new Logger(ProfitIntelligenceService.name);

  getMaterialCosts(): MaterialCostProfile[] {
    return MATERIAL_COSTS;
  }

  getMaterialCost(materialId: string): MaterialCostProfile | undefined {
    return MATERIAL_COSTS.find(m => m.materialId === materialId);
  }

  analyzeProfitability(params: {
    productType: string;
    materials: string[];
    sizeMm: { width: number; height: number };
    cutTimeMins: number;
    engraveTimeMins: number;
    suggestedPrice: number;
    competitionDensity?: number;
    demandStrength?: number;
  }): ProfitAnalysis {
    const { productType, materials, sizeMm, cutTimeMins, engraveTimeMins, suggestedPrice, competitionDensity = 50, demandStrength = 60 } = params;

    // Calculate material cost (use cheapest available material)
    const materialProfiles = materials
      .map(m => this.getMaterialCost(m))
      .filter(Boolean) as MaterialCostProfile[];

    const primaryMaterial = materialProfiles[0] || MATERIAL_COSTS[0];
    const areaSqCm = (sizeMm.width / 10) * (sizeMm.height / 10);
    const materialCost = Math.max(primaryMaterial.costPerSqCm * areaSqCm, 0.50);

    // Machine time cost
    const totalMachineMins = cutTimeMins + engraveTimeMins;
    const machineTimeCost = totalMachineMins * MACHINE_COST_PER_MIN;

    // Labor cost (setup + handling + finishing)
    const setupMins = 2;
    const handlingMins = Math.ceil(totalMachineMins * 0.3);
    const finishingMins = productType.includes('layered') || productType.includes('lamp') ? 5 : 2;
    const laborCost = (setupMins + handlingMins + finishingMins) * LABOR_COST_PER_MIN;

    // Overhead
    const subtotal = materialCost + machineTimeCost + laborCost;
    const overheadCost = subtotal * (OVERHEAD_MULTIPLIER - 1);
    const totalCost = subtotal + overheadCost;

    // Price range
    const minPrice = Math.round(totalCost * 2.5 * 100) / 100;
    const maxPrice = Math.round(totalCost * 5.0 * 100) / 100;

    // Margin
    const marginPercent = Math.round(((suggestedPrice - totalCost) / suggestedPrice) * 100);

    // Profit score (composite)
    const marginScore = Math.min(marginPercent, 100);
    const demandScore = demandStrength;
    const compScore = 100 - competitionDensity;
    const profitScore = Math.round(marginScore * 0.4 + demandScore * 0.35 + compScore * 0.25);

    // Risk assessment
    const riskFactors: string[] = [];
    if (marginPercent < 30) riskFactors.push('Low profit margin');
    if (competitionDensity > 70) riskFactors.push('High competition saturation');
    if (demandStrength < 30) riskFactors.push('Weak demand signal');
    if (primaryMaterial.priceVolatility === 'volatile') riskFactors.push('Volatile material pricing');
    if (primaryMaterial.availability === 'low') riskFactors.push('Limited material availability');
    if (totalMachineMins > 45) riskFactors.push('High machine time per unit');

    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (riskFactors.length >= 3) riskLevel = 'high';
    else if (riskFactors.length >= 1) riskLevel = 'medium';

    // Break-even (assuming $50 monthly fixed costs for listings/marketing)
    const profitPerUnit = suggestedPrice - totalCost;
    const breakEvenUnits = profitPerUnit > 0 ? Math.ceil(50 / profitPerUnit) : 999;

    // Monthly revenue potential (estimated 20-50 units/month for a trending product)
    const estimatedMonthlyUnits = demandStrength > 70 ? 40 : demandStrength > 40 ? 25 : 12;
    const monthlyPotentialRevenue = Math.round(estimatedMonthlyUnits * suggestedPrice);

    // Scalability
    const scalabilityScore = Math.round(
      (totalMachineMins < 10 ? 90 : totalMachineMins < 20 ? 70 : totalMachineMins < 40 ? 50 : 30) * 0.4 +
      (primaryMaterial.availability === 'high' ? 90 : primaryMaterial.availability === 'medium' ? 60 : 30) * 0.3 +
      (marginPercent > 60 ? 90 : marginPercent > 40 ? 60 : 30) * 0.3
    );

    return {
      productType,
      materialCost: Math.round(materialCost * 100) / 100,
      machineTimeCost: Math.round(machineTimeCost * 100) / 100,
      laborCost: Math.round(laborCost * 100) / 100,
      overheadCost: Math.round(overheadCost * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      recommendedPriceRange: { min: minPrice, max: maxPrice },
      profitScore: Math.min(profitScore, 100),
      marginPercent,
      riskLevel,
      riskFactors,
      competitionSaturation: competitionDensity,
      demandStrength,
      breakEvenUnits,
      monthlyPotentialRevenue,
      scalabilityScore,
    };
  }

  batchAnalyze(products: Array<{
    productType: string;
    materials: string[];
    sizeMm: { width: number; height: number };
    cutTimeMins: number;
    engraveTimeMins: number;
    suggestedPrice: number;
    competitionDensity?: number;
    demandStrength?: number;
  }>): ProfitAnalysis[] {
    return products.map(p => this.analyzeProfitability(p));
  }
}
