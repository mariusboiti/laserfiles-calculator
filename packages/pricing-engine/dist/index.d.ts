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
    ruleType: 'FIXED_BASE' | 'PER_CHARACTER' | 'PER_CM2' | 'PER_ITEM' | 'LAYER_MULTIPLIER' | 'ADD_ON_LINK';
    value: number;
    priority: number;
}
export interface TemplatePricingMetrics {
    characterCount?: number;
    areaCm2?: number;
    quantity?: number;
    layersCount?: number;
}
export interface PriceCalculationContext {
    material: PricingMaterialInput;
    addOns: PricingAddOnInput[];
    templatePricing?: {
        rules: TemplatePricingRuleInput[];
        metrics: TemplatePricingMetrics;
    };
}
export declare function calculatePrice(rawInput: unknown, ctx: PriceCalculationContext): OrderItemPriceBreakdown;
