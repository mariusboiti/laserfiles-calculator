import { priceCalculationInputSchema } from '@laser/shared/validation';
import type { OrderItemPriceBreakdown } from '@laser/shared/types';

export interface PricingMaterialInput {
  id: string;
  unitType: 'SHEET' | 'M2';
  costPerSheet?: number | null;
  costPerM2?: number | null;
  sheetWidthMm?: number | null;
  sheetHeightMm?: number | null;
}

export interface PricingAddOnInput {
  id: string;
  name: string;
  costType: 'FIXED' | 'PER_ITEM' | 'PERCENT';
  value: number;
}

export interface TemplatePricingRuleInput {
  id: string;
  ruleType:
    | 'FIXED_BASE'
    | 'PER_CHARACTER'
    | 'PER_CM2'
    | 'PER_ITEM'
    | 'LAYER_MULTIPLIER'
    | 'ADD_ON_LINK';
  value: number;
  priority: number;
}

export interface TemplatePricingMetrics {
  characterCount?: number;
  areaCm2?: number;
  quantity?: number;
  layersCount?: number;
}

interface TemplatePricingBreakdownLineInternal {
  ruleId?: string;
  label: string;
  amount: number;
}

interface TemplatePricingResultInternal {
  templateBasePrice: number;
  lines: TemplatePricingBreakdownLineInternal[];
}

export interface PriceCalculationContext {
  material: PricingMaterialInput;
  addOns: PricingAddOnInput[];
  templatePricing?: {
    rules: TemplatePricingRuleInput[];
    metrics: TemplatePricingMetrics;
  };
}

export function calculatePrice(
  rawInput: unknown,
  ctx: PriceCalculationContext
): OrderItemPriceBreakdown {
  const input = priceCalculationInputSchema.parse(rawInput);

  const areaMm2 = input.widthMm * input.heightMm * input.quantity;
  const areaM2 = areaMm2 / 1_000_000;

  let materialCost = 0;

  if (ctx.material.unitType === 'M2' && ctx.material.costPerM2) {
    materialCost = areaM2 * ctx.material.costPerM2;
  } else if (
    ctx.material.unitType === 'SHEET' &&
    ctx.material.costPerSheet &&
    ctx.material.sheetWidthMm &&
    ctx.material.sheetHeightMm
  ) {
    const sheetAreaM2 =
      (ctx.material.sheetWidthMm * ctx.material.sheetHeightMm) / 1_000_000;
    const sheetsUsed = areaM2 / sheetAreaM2;
    materialCost = sheetsUsed * ctx.material.costPerSheet;
  }

  const wasteFactor = 1 + input.wastePercent / 100;
  materialCost *= wasteFactor;

  const machineCost = (input.machineMinutes / 60) * input.machineHourlyCost;

  let laborCost = 0;
  const appliedAddOns: { id: string; name: string; cost: number }[] = [];

  for (const addOn of ctx.addOns) {
    if (!input.addOnIds.includes(addOn.id)) continue;

    let cost = 0;
    if (addOn.costType === 'FIXED') {
      cost = addOn.value;
    } else if (addOn.costType === 'PER_ITEM') {
      cost = addOn.value * input.quantity;
    } else if (addOn.costType === 'PERCENT') {
      cost = ((materialCost + machineCost) * addOn.value) / 100;
    }

    laborCost += cost;
    appliedAddOns.push({ id: addOn.id, name: addOn.name, cost });
  }

  const totalCost = materialCost + machineCost + laborCost;
  const areaCm2 = areaM2 * 10_000;

  let templateResult: TemplatePricingResultInternal | null = null;
  let recommendedPrice: number;
  let marginPercent: number;

  if (ctx.templatePricing && ctx.templatePricing.rules.length > 0) {
    templateResult = applyTemplatePricing(ctx.templatePricing, {
      areaCm2,
      quantity: input.quantity,
    });

    recommendedPrice = templateResult.templateBasePrice;

    if (recommendedPrice > 0) {
      const profit = recommendedPrice - totalCost;
      marginPercent = round2((profit / recommendedPrice) * 100);
    } else {
      marginPercent = input.targetMarginPercent;
    }
  } else {
    recommendedPrice = totalCost / (1 - input.targetMarginPercent / 100);
    marginPercent = input.targetMarginPercent;
  }

  return {
    materialCost: round2(materialCost),
    machineCost: round2(machineCost),
    laborCost: round2(laborCost),
    addOns: appliedAddOns.map((a) => ({ ...a, cost: round2(a.cost) })),
    marginPercent,
    totalCost: round2(totalCost),
    recommendedPrice: round2(recommendedPrice),
    ...(templateResult && {
      templateBasePrice: round2(templateResult.templateBasePrice),
      templateLines: templateResult.lines.map((l) => ({
        ruleId: l.ruleId,
        label: l.label,
        amount: round2(l.amount),
      })),
    }),
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function applyTemplatePricing(
  tpl: { rules: TemplatePricingRuleInput[]; metrics: TemplatePricingMetrics },
  base: { areaCm2: number; quantity: number },
): TemplatePricingResultInternal {
  const metrics: TemplatePricingMetrics = {
    quantity: base.quantity,
    areaCm2: tpl.metrics.areaCm2 ?? base.areaCm2,
    characterCount: tpl.metrics.characterCount,
    layersCount: tpl.metrics.layersCount,
  };

  const sortedRules = [...tpl.rules].sort((a, b) => a.priority - b.priority);

  let price = 0;
  const lines: TemplatePricingBreakdownLineInternal[] = [];

  for (const rule of sortedRules) {
    let delta = 0;
    switch (rule.ruleType) {
      case 'FIXED_BASE': {
        delta = rule.value;
        break;
      }
      case 'PER_CHARACTER': {
        const count = metrics.characterCount ?? 0;
        delta = count * rule.value;
        break;
      }
      case 'PER_CM2': {
        const areaCm2 = metrics.areaCm2 ?? base.areaCm2;
        delta = areaCm2 * rule.value;
        break;
      }
      case 'PER_ITEM': {
        const qty = metrics.quantity ?? base.quantity;
        delta = qty * rule.value;
        break;
      }
      case 'LAYER_MULTIPLIER': {
        const layers = metrics.layersCount ?? 1;
        delta = layers * rule.value;
        break;
      }
      case 'ADD_ON_LINK': {
        delta = rule.value;
        break;
      }
      default:
        delta = 0;
    }

    if (!delta) continue;

    price += delta;
    lines.push({
      ruleId: rule.id,
      label: ruleLabel(rule.ruleType),
      amount: delta,
    });
  }

  return {
    templateBasePrice: price,
    lines,
  };
}

function ruleLabel(type: TemplatePricingRuleInput['ruleType']): string {
  switch (type) {
    case 'FIXED_BASE':
      return 'Base';
    case 'PER_CHARACTER':
      return 'Per character';
    case 'PER_CM2':
      return 'Per cm²';
    case 'PER_ITEM':
      return 'Per item';
    case 'LAYER_MULTIPLIER':
      return 'Layers';
    case 'ADD_ON_LINK':
      return 'Add-on';
    default:
      return 'Rule';
  }
}
