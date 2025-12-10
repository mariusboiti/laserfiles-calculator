"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculatePrice = calculatePrice;
const validation_1 = require("../../shared/src/validation");
function calculatePrice(rawInput, ctx) {
    const input = validation_1.priceCalculationInputSchema.parse(rawInput);
    const areaMm2 = input.widthMm * input.heightMm * input.quantity;
    const areaM2 = areaMm2 / 1000000;
    let materialCost = 0;
    if (ctx.material.unitType === 'M2' && ctx.material.costPerM2) {
        materialCost = areaM2 * ctx.material.costPerM2;
    }
    else if (ctx.material.unitType === 'SHEET' &&
        ctx.material.costPerSheet &&
        ctx.material.sheetWidthMm &&
        ctx.material.sheetHeightMm) {
        const sheetAreaM2 = (ctx.material.sheetWidthMm * ctx.material.sheetHeightMm) / 1000000;
        const sheetsUsed = areaM2 / sheetAreaM2;
        materialCost = sheetsUsed * ctx.material.costPerSheet;
    }
    const wasteFactor = 1 + input.wastePercent / 100;
    materialCost *= wasteFactor;
    const machineCost = (input.machineMinutes / 60) * input.machineHourlyCost;
    let laborCost = 0;
    const appliedAddOns = [];
    for (const addOn of ctx.addOns) {
        if (!input.addOnIds.includes(addOn.id))
            continue;
        let cost = 0;
        if (addOn.costType === 'FIXED') {
            cost = addOn.value;
        }
        else if (addOn.costType === 'PER_ITEM') {
            cost = addOn.value * input.quantity;
        }
        else if (addOn.costType === 'PERCENT') {
            cost = ((materialCost + machineCost) * addOn.value) / 100;
        }
        laborCost += cost;
        appliedAddOns.push({ id: addOn.id, name: addOn.name, cost });
    }
    const totalCost = materialCost + machineCost + laborCost;
    const areaCm2 = areaM2 * 10000;
    let templateResult = null;
    let recommendedPrice;
    let marginPercent;
    if (ctx.templatePricing && ctx.templatePricing.rules.length > 0) {
        templateResult = applyTemplatePricing(ctx.templatePricing, {
            areaCm2,
            quantity: input.quantity,
        });
        recommendedPrice = templateResult.templateBasePrice;
        if (recommendedPrice > 0) {
            const profit = recommendedPrice - totalCost;
            marginPercent = round2((profit / recommendedPrice) * 100);
        }
        else {
            marginPercent = input.targetMarginPercent;
        }
    }
    else {
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
function round2(value) {
    return Math.round(value * 100) / 100;
}
function applyTemplatePricing(tpl, base) {
    const metrics = {
        quantity: base.quantity,
        areaCm2: tpl.metrics.areaCm2 ?? base.areaCm2,
        characterCount: tpl.metrics.characterCount,
        layersCount: tpl.metrics.layersCount,
    };
    const sortedRules = [...tpl.rules].sort((a, b) => a.priority - b.priority);
    let price = 0;
    const lines = [];
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
        if (!delta)
            continue;
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
function ruleLabel(type) {
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
