"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculatePrice = calculatePrice;
const validation_1 = require("@laser/shared/validation");
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
    const recommendedPrice = totalCost / (1 - input.targetMarginPercent / 100);
    return {
        materialCost: round2(materialCost),
        machineCost: round2(machineCost),
        laborCost: round2(laborCost),
        addOns: appliedAddOns.map((a) => ({ ...a, cost: round2(a.cost) })),
        marginPercent: input.targetMarginPercent,
        totalCost: round2(totalCost),
        recommendedPrice: round2(recommendedPrice),
    };
}
function round2(value) {
    return Math.round(value * 100) / 100;
}
