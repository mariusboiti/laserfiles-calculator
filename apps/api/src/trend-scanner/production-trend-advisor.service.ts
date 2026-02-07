import { Injectable, Logger } from '@nestjs/common';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ProductionRecommendation {
  productType: string;
  trendTitle: string;
  recommendedBatchSize: number;
  batchSizeReasoning: string;
  optimalDimensions: Array<{ label: string; widthMm: number; heightMm: number; reason: string }>;
  materialPurchasing: MaterialPurchaseAdvice[];
  productionTiming: ProductionTimingAdvice;
  estimatedProductionHours: number;
  nestingEfficiency: number;         // 0-100
  sheetUtilization: number;          // 0-100
  dailyOutputCapacity: number;
  weeklyRevenueEstimate: number;
}

export interface MaterialPurchaseAdvice {
  materialId: string;
  materialName: string;
  sheetsNeeded: number;
  estimatedCost: number;
  supplier: string;
  leadTimeDays: number;
  bulkDiscountThreshold: number;
  recommendation: string;
}

export interface ProductionTimingAdvice {
  bestStartDate: string;
  peakDemandWindow: string;
  leadTimeRequired: number;          // days
  listingPrepDays: number;
  productionDays: number;
  shippingBufferDays: number;
  urgency: 'immediate' | 'this-week' | 'this-month' | 'next-month' | 'plan-ahead';
  reasoning: string;
}

// ─── Material supplier database ─────────────────────────────────────────────

const SUPPLIERS: Record<string, { name: string; leadDays: number; bulkThreshold: number }> = {
  'plywood-3mm': { name: 'Local lumber supplier / Amazon', leadDays: 2, bulkThreshold: 20 },
  'plywood-6mm': { name: 'Local lumber supplier / Amazon', leadDays: 2, bulkThreshold: 15 },
  'mdf-3mm': { name: 'Home improvement store', leadDays: 1, bulkThreshold: 25 },
  'bamboo': { name: 'Specialty wood supplier', leadDays: 5, bulkThreshold: 10 },
  'walnut': { name: 'Hardwood dealer', leadDays: 7, bulkThreshold: 5 },
  'acrylic-clear': { name: 'Plastics supplier / TAP Plastics', leadDays: 3, bulkThreshold: 15 },
  'acrylic-colored': { name: 'Plastics supplier', leadDays: 5, bulkThreshold: 10 },
  'acrylic-black': { name: 'Plastics supplier', leadDays: 3, bulkThreshold: 15 },
  'acrylic-gold': { name: 'Specialty plastics', leadDays: 7, bulkThreshold: 5 },
  'acrylic-frosted': { name: 'Plastics supplier', leadDays: 5, bulkThreshold: 10 },
  'leather': { name: 'Leather craft supplier', leadDays: 5, bulkThreshold: 8 },
  'cork-backed': { name: 'Specialty supplier', leadDays: 7, bulkThreshold: 10 },
  'slate': { name: 'Stone/tile supplier', leadDays: 5, bulkThreshold: 20 },
  'basswood-3mm': { name: 'Craft wood supplier', leadDays: 3, bulkThreshold: 20 },
  'pine': { name: 'Local lumber supplier', leadDays: 2, bulkThreshold: 15 },
};

// Material cost per sheet
const MATERIAL_COSTS: Record<string, number> = {
  'plywood-3mm': 8, 'plywood-6mm': 12, 'mdf-3mm': 5, 'bamboo': 14, 'walnut': 25,
  'acrylic-clear': 10, 'acrylic-colored': 14, 'acrylic-black': 12, 'acrylic-gold': 18,
  'acrylic-frosted': 13, 'leather': 20, 'cork-backed': 10, 'slate': 6, 'basswood-3mm': 9, 'pine': 7,
};

// Sheet sizes (mm)
const SHEET_SIZES: Record<string, { w: number; h: number }> = {
  'plywood-3mm': { w: 600, h: 400 }, 'plywood-6mm': { w: 600, h: 400 }, 'mdf-3mm': { w: 600, h: 400 },
  'bamboo': { w: 600, h: 400 }, 'walnut': { w: 300, h: 300 }, 'acrylic-clear': { w: 600, h: 400 },
  'acrylic-colored': { w: 600, h: 400 }, 'acrylic-black': { w: 600, h: 400 }, 'acrylic-gold': { w: 600, h: 400 },
  'acrylic-frosted': { w: 600, h: 400 }, 'leather': { w: 300, h: 300 }, 'cork-backed': { w: 300, h: 300 },
  'slate': { w: 200, h: 200 }, 'basswood-3mm': { w: 600, h: 400 }, 'pine': { w: 600, h: 400 },
};

@Injectable()
export class ProductionTrendAdvisorService {
  private readonly logger = new Logger(ProductionTrendAdvisorService.name);

  generateRecommendation(params: {
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
  }): ProductionRecommendation {
    const {
      productType, trendTitle, trendStrength, growthVelocity,
      competitionDensity, materials, sizeMm, cutTimeMins, engraveTimeMins,
      suggestedPrice, seasonalEvent, daysUntilEvent,
    } = params;

    // ── Batch size calculation ──
    let baseBatch: number;
    if (trendStrength > 80 && competitionDensity < 40) baseBatch = 50;
    else if (trendStrength > 60) baseBatch = 30;
    else if (trendStrength > 40) baseBatch = 15;
    else baseBatch = 8;

    // Adjust for growth velocity
    if (growthVelocity > 10) baseBatch = Math.round(baseBatch * 1.3);
    if (growthVelocity < 0) baseBatch = Math.round(baseBatch * 0.6);

    // Seasonal boost
    if (seasonalEvent && daysUntilEvent && daysUntilEvent < 45) {
      baseBatch = Math.round(baseBatch * 1.5);
    }

    const recommendedBatchSize = Math.max(5, Math.min(baseBatch, 100));

    let batchSizeReasoning = `Based on trend strength (${trendStrength}/100)`;
    if (growthVelocity > 5) batchSizeReasoning += `, accelerating growth (+${growthVelocity.toFixed(1)}%/wk)`;
    if (competitionDensity < 40) batchSizeReasoning += `, low competition`;
    if (seasonalEvent) batchSizeReasoning += `, upcoming ${seasonalEvent}`;
    batchSizeReasoning += `. Recommended: ${recommendedBatchSize} units initial batch.`;

    // ── Optimal dimensions ──
    const optimalDimensions = [
      { label: 'Standard', widthMm: sizeMm.width, heightMm: sizeMm.height, reason: 'Best balance of size and material usage' },
    ];
    // Add compact variant
    if (sizeMm.width > 100) {
      optimalDimensions.push({
        label: 'Compact',
        widthMm: Math.round(sizeMm.width * 0.7),
        heightMm: Math.round(sizeMm.height * 0.7),
        reason: 'Budget-friendly option, fits more per sheet',
      });
    }
    // Add premium variant
    optimalDimensions.push({
      label: 'Premium',
      widthMm: Math.round(sizeMm.width * 1.3),
      heightMm: Math.round(sizeMm.height * 1.3),
      reason: 'Larger size commands higher price point',
    });

    // ── Material purchasing ──
    const primaryMaterial = materials[0] || 'plywood-3mm';
    const sheet = SHEET_SIZES[primaryMaterial] || { w: 600, h: 400 };
    const partsPerSheet = Math.max(1, Math.floor((sheet.w / sizeMm.width)) * Math.floor((sheet.h / sizeMm.height)));
    const sheetsNeeded = Math.ceil(recommendedBatchSize / partsPerSheet);
    const costPerSheet = MATERIAL_COSTS[primaryMaterial] || 8;
    const supplier = SUPPLIERS[primaryMaterial] || { name: 'General supplier', leadDays: 5, bulkThreshold: 10 };

    const materialPurchasing: MaterialPurchaseAdvice[] = [{
      materialId: primaryMaterial,
      materialName: primaryMaterial.replace(/-/g, ' '),
      sheetsNeeded: sheetsNeeded + Math.ceil(sheetsNeeded * 0.1), // 10% waste buffer
      estimatedCost: Math.round((sheetsNeeded + Math.ceil(sheetsNeeded * 0.1)) * costPerSheet * 100) / 100,
      supplier: supplier.name,
      leadTimeDays: supplier.leadDays,
      bulkDiscountThreshold: supplier.bulkThreshold,
      recommendation: sheetsNeeded >= supplier.bulkThreshold
        ? `Order ${sheetsNeeded + 2} sheets for bulk discount. Save ~15%.`
        : `Order ${sheetsNeeded + Math.ceil(sheetsNeeded * 0.1)} sheets (includes 10% waste buffer).`,
    }];

    // ── Production timing ──
    const totalMachineMinsPerUnit = cutTimeMins + engraveTimeMins;
    const setupMinsPerBatch = 15;
    const totalProductionMins = (totalMachineMinsPerUnit * recommendedBatchSize) + setupMinsPerBatch;
    const estimatedProductionHours = Math.round(totalProductionMins / 60 * 10) / 10;

    // Working hours per day (assume 6 productive hours)
    const productionDays = Math.ceil(estimatedProductionHours / 6);
    const listingPrepDays = 2;
    const shippingBufferDays = 5;
    const totalLeadTime = supplier.leadDays + productionDays + listingPrepDays + shippingBufferDays;

    let urgency: ProductionTimingAdvice['urgency'];
    let reasoning: string;
    const bestStartDate = new Date();

    if (daysUntilEvent && daysUntilEvent < totalLeadTime + 7) {
      urgency = 'immediate';
      reasoning = `${seasonalEvent} is in ${daysUntilEvent} days. Start immediately to meet demand window.`;
    } else if (growthVelocity > 10) {
      urgency = 'this-week';
      reasoning = 'Rapid growth detected. Early movers capture the most market share.';
      bestStartDate.setDate(bestStartDate.getDate() + 2);
    } else if (trendStrength > 60) {
      urgency = 'this-month';
      reasoning = 'Strong trend with time to prepare. Plan production within 2 weeks.';
      bestStartDate.setDate(bestStartDate.getDate() + 7);
    } else {
      urgency = 'plan-ahead';
      reasoning = 'Emerging trend. Use this time to perfect designs and test market response.';
      bestStartDate.setDate(bestStartDate.getDate() + 14);
    }

    const productionTiming: ProductionTimingAdvice = {
      bestStartDate: bestStartDate.toISOString().split('T')[0],
      peakDemandWindow: daysUntilEvent
        ? `${Math.max(0, daysUntilEvent - 14)} to ${daysUntilEvent} days from now`
        : 'Ongoing — no specific peak detected',
      leadTimeRequired: totalLeadTime,
      listingPrepDays,
      productionDays,
      shippingBufferDays,
      urgency,
      reasoning,
    };

    // ── Nesting & utilization ──
    const nestingEfficiency = Math.min(95, Math.round((partsPerSheet * sizeMm.width * sizeMm.height) / (sheet.w * sheet.h) * 100));
    const sheetUtilization = nestingEfficiency;

    // ── Daily output ──
    const dailyOutputCapacity = Math.floor((6 * 60) / totalMachineMinsPerUnit);

    // ── Weekly revenue ──
    const weeklyOutput = dailyOutputCapacity * 5;
    const weeklyRevenueEstimate = Math.round(weeklyOutput * suggestedPrice);

    return {
      productType,
      trendTitle,
      recommendedBatchSize,
      batchSizeReasoning,
      optimalDimensions,
      materialPurchasing,
      productionTiming,
      estimatedProductionHours,
      nestingEfficiency,
      sheetUtilization,
      dailyOutputCapacity,
      weeklyRevenueEstimate,
    };
  }
}
