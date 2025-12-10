"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PricingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const pricing_engine_1 = require("@laser/pricing-engine");
let PricingService = class PricingService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async preview(input) {
        const material = await this.prisma.material.findUnique({
            where: { id: input.materialId },
        });
        if (!material) {
            throw new common_1.NotFoundException('Material not found');
        }
        const addOns = input.addOnIds && input.addOnIds.length
            ? await this.prisma.addOn.findMany({ where: { id: { in: input.addOnIds } } })
            : [];
        const breakdown = (0, pricing_engine_1.calculatePrice)({
            materialId: input.materialId,
            quantity: input.quantity,
            widthMm: input.widthMm,
            heightMm: input.heightMm,
            wastePercent: input.wastePercent ?? material.defaultWastePercent ?? 15,
            machineMinutes: input.machineMinutes ?? 0,
            machineHourlyCost: input.machineHourlyCost ?? 0,
            addOnIds: input.addOnIds ?? [],
            targetMarginPercent: input.targetMarginPercent ?? 40,
        }, {
            material: {
                id: material.id,
                unitType: material.unitType,
                costPerSheet: material.costPerSheet ? Number(material.costPerSheet) : null,
                costPerM2: material.costPerM2 ? Number(material.costPerM2) : null,
                sheetWidthMm: material.sheetWidthMm,
                sheetHeightMm: material.sheetHeightMm,
            },
            addOns: addOns.map((a) => ({
                id: a.id,
                name: a.name,
                costType: a.costType,
                value: Number(a.value),
            })),
        });
        return { input, breakdown };
    }
    async priceOrderItem(orderId, itemId, input, userId) {
        const item = await this.prisma.orderItem.findUnique({
            where: { id: itemId },
            include: { order: true },
        });
        if (!item || item.orderId !== orderId) {
            throw new common_1.NotFoundException('Order item not found');
        }
        const result = await this.preview(input);
        const updatedItem = await this.prisma.orderItem.update({
            where: { id: itemId },
            data: {
                priceSnapshotJson: result.breakdown,
            },
        });
        await this.prisma.orderActivityLog.create({
            data: {
                orderId,
                userId,
                field: 'price',
                oldValue: null,
                newValue: `Price recalculated for item ${updatedItem.title}`,
            },
        });
        return {
            item: updatedItem,
            pricing: result.breakdown,
        };
    }
};
exports.PricingService = PricingService;
exports.PricingService = PricingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PricingService);
//# sourceMappingURL=pricing.service.js.map